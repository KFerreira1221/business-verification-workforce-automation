const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const {
  scoreBusiness,
} = require("./confidenceService");

const NAVIGATION_TIMEOUT = 30000;
const MAX_PAGES_PER_BUSINESS = 4;

const USEFUL_LINK_WORDS = [
  "contact",
  "contact-us",
  "about",
  "about-us",
  "locations",
  "location",
  "office",
  "offices",
  "company",
];

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
    `http://www.${withoutWww}`,
  ].filter((url, index, urls) => urls.indexOf(url) === index);
}

function normalizeDomain(url) {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return "";
  }
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
    "this page does not exist",
    "website unavailable",
  ];

  return indicators.some((indicator) => combined.includes(indicator));
}

function normalizeBusinessName(businessName) {
  return String(businessName || "")
    .toLowerCase()
    .replace(
      /\b(llc|inc|corp|corporation|company|co|ltd|limited)\b/g,
      ""
    )
    .replace(/[^a-z0-9]/g, "");
}

function businessNameMatchesPage(businessName, text, title) {
  const normalizedBusinessName =
    normalizeBusinessName(businessName);

  const pageContent = `${title || ""} ${text || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return (
    normalizedBusinessName.length >= 3 &&
    pageContent.includes(normalizedBusinessName)
  );
}

function uniqueValues(values) {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    ),
  ];
}

function extractPhones(text) {
  const matches =
    String(text || "").match(
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    ) || [];

  return uniqueValues(matches);
}

function extractEmails(text) {
  const matches =
    String(text || "").match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    ) || [];

  return uniqueValues(matches);
}

function extractAddresses(text) {
  const cleanText = String(text || "").replace(/\s+/g, " ");

  const addressRegex =
    /\b\d{1,6}\s+[A-Za-z0-9.'\- ]{2,80}\s(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Parkway|Pkwy|Highway|Hwy|Place|Pl)\b(?:[.,\s]+(?:Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+)?(?:[,\s]+[A-Za-z .'-]{2,40})?(?:[,\s]+(?:FL|Florida|GA|Georgia|NY|New York|CA|California))?(?:[,\s]+\d{5}(?:-\d{4})?)?/gi;

  const matches = cleanText.match(addressRegex) || [];

  return uniqueValues(matches);
}

function isUsefulInternalUrl(url, rootDomain) {
  try {
    const parsed = new URL(url);

    const domain = parsed.hostname
      .replace(/^www\./i, "")
      .toLowerCase();

    if (domain !== rootDomain) {
      return false;
    }

    const pathText = parsed.pathname.toLowerCase();

    return USEFUL_LINK_WORDS.some((word) =>
      pathText.includes(word)
    );
  } catch {
    return false;
  }
}

async function findWorkingWebsite(rawWebsite) {
  const candidates = buildUrlCandidates(rawWebsite);
  const attempts = [];

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  try {
    for (const candidate of candidates) {
      try {
        const response = await page.goto(candidate, {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT,
        });

        const httpStatus = response?.status() || null;
        const finalUrl = page.url();

        const attempt = {
          attemptedUrl: candidate,
          finalUrl,
          httpStatus,
          success:
            Boolean(response) &&
            httpStatus >= 200 &&
            httpStatus < 400,
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
                      : null,
        };

        attempts.push(attempt);

        if (attempt.success) {
          return {
            success: true,
            finalUrl,
            attempts,
          };
        }
      } catch (error) {
        attempts.push({
          attemptedUrl: candidate,
          finalUrl: null,
          httpStatus: null,
          success: false,
          errorType: classifyNavigationError(error),
          errorMessage: error.message,
        });
      }
    }

    return {
      success: false,
      finalUrl: null,
      attempts,
    };
  } finally {
    await browser.close();
  }
}

async function verifyBusiness(businessName, website) {
  const screenshotsDir = path.join(
    __dirname,
    "../screenshots"
  );

  const screenshotPath = path.join(
    screenshotsDir,
    "current.png"
  );

  fs.mkdirSync(screenshotsDir, {
    recursive: true,
  });

  if (fs.existsSync(screenshotPath)) {
    fs.unlinkSync(screenshotPath);
  }

  const initialWebsite = await findWorkingWebsite(website);

  if (!initialWebsite.success) {
    const lastAttempt =
      initialWebsite.attempts[
        initialWebsite.attempts.length - 1
      ];

    return {
      businessName,
      website,
      reachable: false,
      websiteVerified: false,
      confidence: 0,
      status: "needs_review",
      errorType:
        lastAttempt?.errorType || "unreachable",
      errorMessage:
        lastAttempt?.errorMessage || null,
      attempts: initialWebsite.attempts,
      pagesVisited: [],
      phones: [],
      emails: [],
      addresses: [],
      phoneFound: false,
      emailFound: false,
      addressFound: false,
      screenshotAvailable: false,
      crawledAt: new Date().toISOString(),
    };
  }

  const startingUrl = initialWebsite.finalUrl;
  const rootDomain = normalizeDomain(startingUrl);

  const pagesVisited = [];
  const phones = [];
  const emails = [];
  const addresses = [];

  let businessNameFound = false;
  let screenshotSaved = false;
  let rootPageTitle = "";
  let rootHttpStatus = null;

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage({
    viewport: {
      width: 1365,
      height: 768,
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  });

  const urlsToVisit = [startingUrl];
  const visitedUrls = new Set();

  try {
    while (
      urlsToVisit.length > 0 &&
      visitedUrls.size < MAX_PAGES_PER_BUSINESS
    ) {
      const currentUrl = urlsToVisit.shift();

      if (
        !currentUrl ||
        visitedUrls.has(currentUrl)
      ) {
        continue;
      }

      visitedUrls.add(currentUrl);

      try {
        console.log(
          `[CRAWLER] Researching ${businessName}: ${currentUrl}`
        );

        const response = await page.goto(currentUrl, {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT,
        });

        await page.waitForTimeout(500);

        const finalUrl = page.url();
        const title = await page.title();

        const text =
          (await page
            .locator("body")
            .innerText({
              timeout: 10000,
            })
            .catch(() => "")) || "";

        const httpStatus = response?.status() || null;
        const soft404 = isSoft404(text, title);

        if (!rootPageTitle) {
          rootPageTitle = title;
          rootHttpStatus = httpStatus;
        }

        const nameFound =
          businessNameMatchesPage(
            businessName,
            text,
            title
          );

        if (nameFound) {
          businessNameFound = true;
        }

        const pagePhones = extractPhones(text);
        const pageEmails = extractEmails(text);
        const pageAddresses = extractAddresses(text);

        phones.push(...pagePhones);
        emails.push(...pageEmails);
        addresses.push(...pageAddresses);

        pagesVisited.push({
          url: finalUrl,
          title,
          httpStatus,
          soft404,
          businessNameFound: nameFound,
          phones: pagePhones,
          emails: pageEmails,
          addresses: pageAddresses,
          checkedAt: new Date().toISOString(),
        });

        if (!screenshotSaved && !soft404) {
          try {
            await page.screenshot({
              path: screenshotPath,
              fullPage: false,
            });

            screenshotSaved = true;
          } catch (screenshotError) {
            console.error(
              "[CRAWLER] Screenshot failed:",
              screenshotError.message
            );
          }
        }

        if (!soft404) {
          const links = await page
            .locator("a")
            .evaluateAll((anchors) =>
              anchors.map((anchor) => ({
                href: anchor.href,
                text: (
                  anchor.innerText || ""
                ).toLowerCase(),
              }))
            )
            .catch(() => []);

          for (const link of links) {
            if (
              urlsToVisit.length +
                visitedUrls.size >=
              MAX_PAGES_PER_BUSINESS
            ) {
              break;
            }

            if (
              isUsefulInternalUrl(
                link.href,
                rootDomain
              ) &&
              !visitedUrls.has(link.href) &&
              !urlsToVisit.includes(link.href)
            ) {
              urlsToVisit.push(link.href);
            }
          }
        }
      } catch (error) {
        pagesVisited.push({
          url: currentUrl,
          failed: true,
          error: error.message,
          errorType:
            classifyNavigationError(error),
          checkedAt: new Date().toISOString(),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const uniquePhones = uniqueValues(phones);
  const uniqueEmails = uniqueValues(emails);
  const uniqueAddresses = uniqueValues(addresses);

  const evidence = {
    businessName,
    website,
    finalUrl: startingUrl,
    pageTitle: rootPageTitle,
    reachable: pagesVisited.some(
      (pageItem) =>
        !pageItem.failed &&
        !pageItem.soft404
    ),
    websiteVerified: pagesVisited.some(
      (pageItem) =>
        !pageItem.failed &&
        !pageItem.soft404
    ),
    httpStatus: rootHttpStatus,
    soft404:
      pagesVisited.length > 0 &&
      pagesVisited.every(
        (pageItem) => pageItem.soft404
      ),
    businessNameFound,
    phoneFound: uniquePhones.length > 0,
    addressFound: uniqueAddresses.length > 0,
    emailFound: uniqueEmails.length > 0,
    phones: uniquePhones,
    emails: uniqueEmails,
    addresses: uniqueAddresses,
    pagesVisited,
    attempts: initialWebsite.attempts,
    pagesCrawled: pagesVisited.length,
    crawledAt: new Date().toISOString(),
  };

  let confidence;

  try {
    confidence = scoreBusiness(evidence);
  } catch (error) {
    console.error(
      "[CRAWLER] Confidence scoring failed:",
      error.message
    );

    confidence = 0;

    if (evidence.reachable) {
      confidence += 40;
    }

    if (evidence.businessNameFound) {
      confidence += 20;
    }

    if (evidence.phoneFound) {
      confidence += 15;
    }

    if (evidence.addressFound) {
      confidence += 15;
    }

    if (evidence.emailFound) {
      confidence += 10;
    }

    confidence = Math.min(confidence, 100);
  }

  return {
    ...evidence,
    confidence,
    status:
      confidence >= 75
        ? "verified"
        : "needs_review",
    screenshotAvailable:
      screenshotSaved &&
      fs.existsSync(screenshotPath),
  };
}

module.exports = {
  verifyBusiness,
  buildUrlCandidates,
};
