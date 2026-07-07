const express = require("express");
const router = express.Router();
const { loadBusinesses } = require("../services/csvService");
const { verifyBusiness } = require("../services/crawlerService");

router.post("/run", async (req, res) => {
  try {
    const { businessName, website } = req.body;

    const result = await verifyBusiness(businessName, website);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.post("/run-csv-first", async (req, res) => {
  try {
    const businesses = await loadBusinesses();
    const firstBusiness = businesses[0];

    const websiteRaw =
      firstBusiness.website ||
      firstBusiness.Website ||
      firstBusiness.business_website ||
      firstBusiness.BusinessWebsite;

    const businessName =
      firstBusiness.business_name ||
      firstBusiness.BusinessName ||
      firstBusiness.name ||
      firstBusiness.Name;

    const website = websiteRaw.startsWith("http")
      ? websiteRaw
      : `https://${websiteRaw}`;

    const result = await verifyBusiness(businessName, website);

    res.json({
      success: true,
      source: "BusinessDatasets.csv",
      scannedBusiness: firstBusiness,
      result
    });
  } catch (error) {
    console.error("CSV verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;