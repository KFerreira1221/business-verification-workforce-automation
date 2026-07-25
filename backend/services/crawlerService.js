const {
  PlaywrightCrawler,
} = require("crawlee");

const path = require("path");
const fs = require("fs");

const {
  scoreBusiness,
} = require("./confidenceService");


// =====================================================
// SETTINGS
// =====================================================

const NAVIGATION_TIMEOUT = 30000;

const MAX_PAGES_PER_BUSINESS = 8;

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
  "team",
  "careers",
  "jobs",
];


// =====================================================
// URL HELPERS
// =====================================================

function buildUrlCandidates(rawWebsite) {
  const cleaned = String(
    rawWebsite || ""
  ).trim();

  if (!cleaned) {
    return [];
  }

  const withoutProtocol = cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  const withoutWww =
    withoutProtocol.replace(
      /^www\./i,
      ""
    );

  return [
    `https://${withoutWww}`,
    `https://www.${withoutWww}`,
    `http://${withoutWww}`,
    `http://www.${withoutWww}`,
  ].filter(
    (url, index, urls) =>
      urls.indexOf(url) === index
  );
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


// =====================================================
// ERROR CLASSIFICATION
// =====================================================

function classifyNavigationError(
  error
) {
  const message = String(
    error?.message || error
  ).toLowerCase();

  if (
    message.includes("timeout")
  ) {
    return "timeout";
  }

  if (
    message.includes(
      "name_not_resolved"
    ) ||
    message.includes("dns") ||
    message.includes("enotfound")
  ) {
    return "dns_error";
  }

  if (
    message.includes(
      "connection_refused"
    ) ||
    message.includes(
      "econnrefused"
    )
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


// =====================================================
// PAGE HELPERS
// =====================================================

function isSoft404(
  text,
  title
) {
  const combined =
    `${title || ""} ${text || ""}`
      .toLowerCase();

  const indicators = [
    "page not found",
    "404 not found",
    "the page you requested could not be found",
    "this page does not exist",
    "sorry, we couldn't find that page",
    "website unavailable",
  ];

  return indicators.some(
    (indicator) =>
      combined.includes(indicator)
  );
}


function normalizeBusinessName(
  businessName
) {
  return String(
    businessName || ""
  )
    .toLowerCase()
    .replace(
      /\b(llc|inc|corp|corporation|company|co|ltd|limited)\b/g,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}


function businessNameMatchesPage(
  businessName,
  text,
  title
) {
  const normalizedBusinessName =
    normalizeBusinessName(
      businessName
    );

  const pageContent =
    `${title || ""} ${text || ""}`
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  return (
    normalizedBusinessName.length >= 3 &&
    pageContent.includes(
      normalizedBusinessName
    )
  );
}


// =====================================================
// EXTRACTION HELPERS
// =====================================================

function uniqueValues(values) {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            String(value || "")
              .trim()
        )
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
  const cleanText =
    String(text || "")
      .replace(/\s+/g, " ");

  const addressRegex =
    /\b\d{1,6}\s+[A-Za-z0-9.'\- ]{2,80}\s(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Parkway|Pkwy|Highway|Hwy|Place|Pl)\b(?:[.,\s]+(?:Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+)?(?:[,\s]+[A-Za-z .'-]{2,40})?(?:[,\s]+(?:FL|Florida))?(?:[,\s]+\d{5}(?:-\d{4})?)?/gi;

  const matches =
    cleanText.match(
      addressRegex
    ) || [];

  return uniqueValues(matches);
}


// =====================================================
// LINK FILTER
// =====================================================

function isUsefulInternalUrl(
  url,
  rootDomain
) {
  try {
    const parsed =
      new URL(url);

    const domain =
      parsed.hostname
        .replace(/^www\./i, "")
        .toLowerCase();

    if (
      domain !== rootDomain
    ) {
      return false;
    }

    const pathText =
      parsed.pathname
        .toLowerCase();

    return USEFUL_LINK_WORDS.some(
      (word) =>
        pathText.includes(word)
    );
  } catch {
    return false;
  }
}


// =====================================================
// FIND FIRST WORKING WEBSITE
// =====================================================

async function findWorkingWebsite(
  rawWebsite
) {
  const candidates =
    buildUrlCandidates(
      rawWebsite
    );

  const attempts = [];

  const {
    chromium,
  } = require("playwright");

  const browser =
    await chromium.launch({
      headless: true,
    });

  const page =
    await browser.newPage();

  try {
    for (
      const candidate
      of candidates
    ) {
      try {
        const response =
          await page.goto(
            candidate,
            {
              waitUntil:
                "domcontentloaded",

              timeout:
                NAVIGATION_TIMEOUT,
            }
          );

        const httpStatus =
          response?.status() ||
          null;

        const finalUrl =
          page.url();

        const attempt = {
          attemptedUrl:
            candidate,

          finalUrl,

          httpStatus,

          success:
            Boolean(response) &&
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

        attempts.push(
          attempt
        );

        if (
          attempt.success
        ) {
          return {
            success: true,
            finalUrl,
            attempts,
          };
        }

        if (
          attempt.errorType ===
            "access_denied" ||
          attempt.errorType ===
            "rate_limited"
        ) {
          break;
        }
      } catch (error) {
        attempts.push({
          attemptedUrl:
            candidate,

          finalUrl:
            null,

          httpStatus:
            null,

          success:
            false,

          errorType:
            classifyNavigationError(
              error
            ),

          errorMessage:
            error.message,
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


// =====================================================
// VERIFY BUSINESS WITH CRAWLEE
// =====================================================

async function verifyBusiness(
  businessName,
  website
) {
  const screenshotsDir =
    path.join(
      __dirname,
      "../screenshots"
    );

  const screenshotPath =
    path.join(
      screenshotsDir,
      "current.png"
    );

  fs.mkdirSync(
    screenshotsDir,
    {
      recursive: true,
    }
  );

  if (
    fs.existsSync(
      screenshotPath
    )
  ) {
    fs.unlinkSync(
      screenshotPath
    );
  }


  // ==================================================
  // STEP 1 — FIND A WORKING DOMAIN
  // ==================================================

  const initialWebsite =
    await findWorkingWebsite(
      website
    );

  if (
    !initialWebsite.success
  ) {
    const lastAttempt =
      initialWebsite
        .attempts[
          initialWebsite
            .attempts
            .length - 1
        ];

    return {
      businessName,
      website,

      reachable: false,

      confidence: 0,

      status:
        "needs_review",

      errorType:
        lastAttempt
          ?.errorType ||
        "unreachable",

      errorMessage:
        lastAttempt
          ?.errorMessage ||
        null,

      attempts:
        initialWebsite
          .attempts,

      pagesVisited: [],

      phones: [],

      emails: [],

      addresses: [],

      screenshotAvailable:
        false,

      crawledAt:
        new Date()
          .toISOString(),
    };
  }


  const startingUrl =
    initialWebsite.finalUrl;

  const rootDomain =
    normalizeDomain(
      startingUrl
    );


  // ==================================================
  // COLLECTED EVIDENCE
  // ==================================================

  const pagesVisited = [];

  const phones = [];

  const emails = [];

  const addresses = [];

  let businessNameFound =
    false;

  let screenshotSaved =
    false;

  let rootPageTitle = "";

  let rootHttpStatus =
    null;


  // ==================================================
  // STEP 2 — CRAWLEE
  // ==================================================

  const crawler =
    new PlaywrightCrawler({

      maxRequestsPerCrawl:
        MAX_PAGES_PER_BUSINESS,

      requestHandlerTimeoutSecs:
        45,

      navigationTimeoutSecs:
        30,

      maxConcurrency:
        2,

      launchContext: {
        launchOptions: {
          headless: true,
        },
      },


      async requestHandler({
        request,
        page,
        enqueueLinks,
        log,
      }) {

        const url =
          request.loadedUrl ||
          request.url;

        log.info(
          `Researching ${businessName}: ${url}`
        );

        await page.waitForTimeout(
          500
        );


        const title =
          await page.title();

        const text =
          (
            await page.textContent(
              "body"
            )
          ) || "";


        const soft404 =
          isSoft404(
            text,
            title
          );


        const response =
          await page
            .evaluate(
              () =>
                document
                  .readyState
            )
            .catch(
              () => null
            );


        if (
          !rootPageTitle
        ) {
          rootPageTitle =
            title;
        }


        if (
          businessNameMatchesPage(
            businessName,
            text,
            title
          )
        ) {
          businessNameFound =
            true;
        }


        const pagePhones =
          extractPhones(
            text
          );

        const pageEmails =
          extractEmails(
            text
          );

        const pageAddresses =
          extractAddresses(
            text
          );


        phones.push(
          ...pagePhones
        );

        emails.push(
          ...pageEmails
        );

        addresses.push(
          ...pageAddresses
        );


        pagesVisited.push({
          url,
          title,

          soft404,

          businessNameFound:
            businessNameMatchesPage(
              businessName,
              text,
              title
            ),

          phones:
            pagePhones,

          emails:
            pageEmails,

          addresses:
            pageAddresses,

          checkedAt:
            new Date()
              .toISOString(),
        });


        // --------------------------------------------
        // Save one screenshot for frontend/demo.
        // --------------------------------------------

        if (
          !soft404
        ) {
          try {
            await page.screenshot({
              path:
                screenshotPath,

              fullPage:
                false,
            });

            screenshotSaved =
              true;
          } catch (
            screenshotError
          ) {
            log.warning(
              `Screenshot failed: ${screenshotError.message}`
            );
          }
        }


        // --------------------------------------------
        // Find useful internal links
        // --------------------------------------------

        if (
          !soft404
        ) {
          await enqueueLinks({
            strategy:
              "same-domain",

            limit:
              20,

            transformRequestFunction:
              (req) => {
                if (
                  !isUsefulInternalUrl(
                    req.url,
                    rootDomain
                  )
                ) {
                  return false;
                }

                return req;
              },
          });
        }
      },


      async failedRequestHandler({
        request,
        error,
        log,
      }) {
        log.warning(
          `Failed page: ${request.url} — ${error.message}`
        );

        pagesVisited.push({
          url:
            request.url,

          failed: true,

          error:
            error.message,

          checkedAt:
            new Date()
              .toISOString(),
        });
      },
    });


  // ==================================================
  // STEP 3 — RUN CRAWL
  // ==================================================

  try {
    await crawler.run([
      startingUrl,
    ]);
  } catch (error) {
    console.error(
      "[CRAWLER] Crawlee error:",
      error
    );
  }


  // ==================================================
  // STEP 4 — CLEAN EVIDENCE
  // ==================================================

  const uniquePhones =
    uniqueValues(
      phones
    );

  const uniqueEmails =
    uniqueValues(
      emails
    );

  const uniqueAddresses =
    uniqueValues(
      addresses
    );


  // ==================================================
  // STEP 5 — BUILD EVIDENCE OBJECT
  // ==================================================

  const evidence = {
    businessName,

    website,

    finalUrl:
      startingUrl,

    pageTitle:
      rootPageTitle,

    reachable:
      pagesVisited.some(
        (page) =>
          !page.failed &&
          !page.soft404
      ),

    httpStatus:
      rootHttpStatus,

    soft404:
      pagesVisited.length > 0 &&
      pagesVisited.every(
        (page) =>
          page.soft404
      ),

    businessNameFound,

    phoneFound:
      uniquePhones.length > 0,

    addressFound:
      uniqueAddresses.length > 0,

    emailFound:
      uniqueEmails.length > 0,

    phones:
      uniquePhones,

    emails:
      uniqueEmails,

    addresses:
      uniqueAddresses,

    pagesVisited,

    attempts:
      initialWebsite.attempts,

    pagesCrawled:
      pagesVisited.length,

    crawledAt:
      new Date()
        .toISOString(),
  };


  // ==================================================
  // STEP 6 — SCORE
  // ==================================================

  const confidence =
    scoreBusiness(
      evidence
    );


  return {
    ...evidence,

    confidence,

    status:
      confidence >= 75
        ? "verified"
        : "needs_review",

    screenshotAvailable:
      screenshotSaved &&
      fs.existsSync(
        screenshotPath
      ),
  };
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  verifyBusiness,
  buildUrlCandidates,
};
