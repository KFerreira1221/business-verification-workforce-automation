const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { scoreBusiness } = require("./confidenceService");

const NAVIGATION_TIMEOUT = 30000;

function buildUrlCandidates(rawWebsite) {
  const cleaned = String(rawWebsite || "").trim();

  if (!cleaned) {
    return [];
  }

  const withoutProtocol = cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  const withoutWww = withoutProtocol.replace(/^www\./i, "");

  return [
    `https://${withoutWww}`,
    `https://www.${withoutWww}`,
    `http://${withoutWww}`,
    `http://www.${withoutWww}`
  ].filter((url, index, urls) => urls.indexOf(url) === index);
}

function classifyNavigationError(error) {
  const message = String(error?.message || error).toLowerCase();

  if (message.includes("timeout")) {
    return "timeout";
  }

  if (
    message.includes("name_not_resolved") ||
    message.includes("dns") ||
    message.includes("enotfound")
  ) {
    return "dns_error";
  }

  if (
    message.includes("connection_refused") ||
    message.includes("econnrefused")
  ) {
    return "connection_refused";
  }

  if (
    message.includes("certificate") ||
    message.includes("ssl") ||
    message.includes("cert_")
  ) {
    return "certificate_error";
  }

  return "navigation_error";
}

function isSoft404(text, title) {
  const combined = `${title || ""} ${text || ""}`.toLowerCase();

  const indicators = [
    "page not found",
    "404 not found",
    "the page you requested could not be found",
    "this page does not exist",
    "sorry, we couldn't find that page",
    "website unavailable"
  ];

  return indicators.some((indicator) => combined.includes(indicator));
}

function businessNameMatchesPage(businessName, text, title) {
  const normalizedBusinessName = String(businessName || "")
    .toLowerCase()
    .replace(
      /\b(llc|inc|corp|corporation|company|co|ltd|limited)\b/g,
      ""
    )
    .replace(/[^a-z0-9]/g, "");

  const pageContent = `${title || ""} ${text || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return (
    normalizedBusinessName.length >= 3 &&
    pageContent.includes(normalizedBusinessName)
  );
}

async function tryWebsite(page, url) {
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT
    });

    const httpStatus = response?.status() || null;
    const finalUrl = page.url();

    return {
      success: Boolean(response) && httpStatus < 400,
      httpStatus,
      finalUrl,
      attemptedUrl: url,
      errorType:
        httpStatus === 404
          ? "not_found"
          : httpStatus === 403
            ? "access_denied"
            : httpStatus === 429
              ? "rate_limited"
              : httpStatus >= 500
                ? "server_error"
                : httpStatus >= 400
                  ? "http_error"
                  : null
    };
  } catch (error) {
    return {
      success: false,
      httpStatus: null,
      finalUrl: null,
      attemptedUrl: url,
      errorType: classifyNavigationError(error),
      errorMessage: error.message
    };
  }
}

async function verifyBusiness(businessName, website) {
  const screenshotsDir = path.join(__dirname, "../screenshots");
  const screenshotPath = path.join(screenshotsDir, "current.png");

  fs.mkdirSync(screenshotsDir, { recursive: true });

  if (fs.existsSync(screenshotPath)) {
    fs.unlinkSync(screenshotPath);
  }

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    viewport: {
      width: 1100,
      height: 650
    },
    userAgent:
      "Mozilla/5.0 (compatible; BusinessVerificationBot/1.0; public-business-verification)"
  });

  const attempts = [];

  try {
    const candidates = buildUrlCandidates(website);

    if (candidates.length === 0) {
      return {
        businessName,
        website,
        reachable: false,
        confidence: 0,
        status: "needs_review",
        errorType: "missing_website",
        screenshotAvailable: false,
        attempts
      };
    }

    let successfulAttempt = null;

    for (const candidate of candidates) {
      const attempt = await tryWebsite(page, candidate);
      attempts.push(attempt);

      if (attempt.success) {
        successfulAttempt = attempt;
        break;
      }

      // Do not repeatedly retry a site that explicitly denied
      // access or asked the crawler to slow down.
      if (
        attempt.errorType === "access_denied" ||
        attempt.errorType === "rate_limited"
      ) {
        break;
      }
    }

    if (!successfulAttempt) {
      const lastAttempt = attempts[attempts.length - 1];

      return {
        businessName,
        website,
        reachable: false,
        httpStatus: lastAttempt?.httpStatus || null,
        errorType: lastAttempt?.errorType || "unreachable",
        errorMessage: lastAttempt?.errorMessage || null,
        confidence: 0,
        status: "needs_review",
        screenshotAvailable: false,
        attempts
      };
    }

    await page.waitForTimeout(1000);

    const text = (await page.textContent("body")) || "";
    const pageTitle = await page.title();
    const soft404 = isSoft404(text, pageTitle);

    if (!soft404) {
      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });
    }

    const evidence = {
      businessName,
      website,
      finalUrl: successfulAttempt.finalUrl,
      pageTitle,
      reachable: !soft404,
      httpStatus: successfulAttempt.httpStatus,
      soft404,
      businessNameFound: businessNameMatchesPage(
        businessName,
        text,
        pageTitle
      ),
      phoneFound: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text),
      addressFound:
        /\d+\s+[A-Za-z0-9\s.,'-]+(Street|St|Ave|Avenue|Blvd|Boulevard|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/i.test(
          text
        ),
      attempts
    };

    const confidence = soft404 ? 0 : scoreBusiness(evidence);

    return {
      ...evidence,
      confidence,
      status:
        !soft404 && confidence >= 75 ? "verified" : "needs_review",
      screenshotAvailable:
        !soft404 && fs.existsSync(screenshotPath)
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  verifyBusiness,
  buildUrlCandidates
};
