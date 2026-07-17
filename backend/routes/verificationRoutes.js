const express = require("express");
const router = express.Router();
const pool = require("../services/db");
const { loadBusinesses } = require("../services/csvService");
const { verifyBusiness } = require("../services/crawlerService");
const { normalizeWebsite, saveVerificationResult } = require("../services/verificationTrackingService");

router.post("/run", async (req, res) => {
  try {
    const { businessName, website } = req.body;
    if (!businessName || !website) {
      return res.status(400).json({ success: false, error: "businessName and website are required" });
    }

    const normalizedWebsite = normalizeWebsite(website);
    const result = await verifyBusiness(businessName, normalizedWebsite);
    const saved = await saveVerificationResult({ businessName, website: normalizedWebsite, result });
    res.json({ success: true, result, saved });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/run-csv-first", async (req, res) => {
  try {
    const businesses = await loadBusinesses();
    const firstBusiness = businesses[0];
    if (!firstBusiness) return res.status(404).json({ success: false, error: "CSV contains no businesses" });

    const websiteRaw = firstBusiness.website || firstBusiness.Website || firstBusiness.business_website || firstBusiness.BusinessWebsite;
    const businessName = firstBusiness.business_name || firstBusiness.BusinessName || firstBusiness.name || firstBusiness.Name;
    if (!businessName || !websiteRaw) {
      return res.status(400).json({ success: false, error: "CSV row must include a business name and website" });
    }

    const website = normalizeWebsite(websiteRaw);
    const result = await verifyBusiness(businessName, website);
    const saved = await saveVerificationResult({ businessName, website, result });
    res.json({ success: true, source: "BusinessDatasets.csv", scannedBusiness: firstBusiness, result, saved });
  } catch (error) {
    console.error("CSV verification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT vr.verification_id, b.business_name, b.website,
              vr.verification_status, vr.confidence_score,
              vr.discrepancies, vr.verified_at
       FROM verification_records vr
       JOIN businesses b ON vr.business_id = b.business_id
       ORDER BY vr.verified_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Verification history error:", error);
    res.status(500).json({ error: "Failed to load verification history" });
  }
});

module.exports = router;
