const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { scoreBusiness } = require("./confidenceService");

async function verifyBusiness(businessName, website) {
  const screenshotsDir = path.join(__dirname, "../screenshots");
  const screenshotPath = path.join(screenshotsDir, "current.png");

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1100, height: 650 }
  });

  try {
    await page.goto(website, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    for (let i = 0; i < 8; i++) {
      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });

      await page.waitForTimeout(1000);
    }

    const text = await page.textContent("body");
    const pageTitle = await page.title();

    const evidence = {
      businessName,
      website,
      pageTitle,
      phoneFound: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text || ""),
      addressFound:
        /\d+\s+[A-Za-z0-9\s]+(Street|St|Ave|Avenue|Blvd|Boulevard|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct)/i.test(text || "")
    };

    const confidence = scoreBusiness(evidence);

    return {
      ...evidence,
      confidence,
      status: confidence >= 75 ? "verified" : "needs_review"
    };
  } finally {
    await browser.close();
  }
}

module.exports = { verifyBusiness };