const express = require("express");
const router = express.Router();

const pool = require("../services/db");
const { loadBusinesses } = require("../services/csvService");
const { verifyBusiness } = require("../services/crawlerService");

const {
  normalizeWebsite,
  saveVerificationResult,
} = require("../services/verificationTrackingService");


// =====================================================
// VERIFY ONE BUSINESS
// =====================================================

router.post("/run", async (req, res) => {
  try {
    const { businessName, website } = req.body;

    if (!businessName || !website) {
      return res.status(400).json({
        success: false,
        error: "businessName and website are required",
      });
    }

    const normalizedWebsite = normalizeWebsite(website);

    console.log("\n========================================");
    console.log("[VERIFY] Starting single verification");
    console.log(`[VERIFY] Business: ${businessName}`);
    console.log(`[VERIFY] Website: ${normalizedWebsite}`);
    console.log("========================================\n");

    const result = await verifyBusiness(
      businessName,
      normalizedWebsite
    );

    const saved = await saveVerificationResult({
      businessName,
      website: normalizedWebsite,
      result,
    });

    res.json({
      success: true,
      result,
      saved,
    });
  } catch (error) {
    console.error("[VERIFY] Verification error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// TEST ONLY THE FIRST BUSINESS FROM CSV
// Keep this route because it is useful for debugging.
// =====================================================

router.post("/run-csv-first", async (req, res) => {
  try {
    const businesses = await loadBusinesses();

    const firstBusiness = businesses[0];

    if (!firstBusiness) {
      return res.status(404).json({
        success: false,
        error: "CSV contains no businesses",
      });
    }

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

    if (!businessName || !websiteRaw) {
      return res.status(400).json({
        success: false,
        error:
          "CSV row must include a business name and website",
      });
    }

    const website = normalizeWebsite(websiteRaw);

    console.log("\n========================================");
    console.log("[CSV TEST] Testing first CSV business");
    console.log(`[CSV TEST] Business: ${businessName}`);
    console.log(`[CSV TEST] Website: ${website}`);
    console.log("========================================\n");

    const result = await verifyBusiness(
      businessName,
      website
    );

    const saved = await saveVerificationResult({
      businessName,
      website,
      result,
    });

    res.json({
      success: true,
      source: "BusinessDatasets.csv",
      scannedBusiness: firstBusiness,
      result,
      saved,
    });
  } catch (error) {
    console.error(
      "[CSV TEST] CSV verification error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// VERIFY ALL BUSINESSES FROM CSV
// =====================================================

router.post("/run-csv", async (req, res) => {
  try {
    const businesses = await loadBusinesses();

    if (!businesses.length) {
      return res.status(404).json({
        success: false,
        error: "CSV contains no businesses",
      });
    }

    console.log("\n========================================");
    console.log("[CSV BATCH] Starting CSV verification");
    console.log(
      `[CSV BATCH] Businesses loaded: ${businesses.length}`
    );
    console.log("========================================\n");

    const results = [];

    for (
      let index = 0;
      index < businesses.length;
      index++
    ) {
      const business = businesses[index];

      const businessName =
        business.business_name ||
        business.BusinessName ||
        business.name ||
        business.Name;

      const websiteRaw =
        business.website ||
        business.Website ||
        business.business_website ||
        business.BusinessWebsite;

      console.log("\n----------------------------------------");
      console.log(
        `[CSV BATCH] Business ${index + 1} of ${businesses.length}`
      );
      console.log(
        `[CSV BATCH] Name: ${businessName || "MISSING"}`
      );
      console.log(
        `[CSV BATCH] Website: ${websiteRaw || "MISSING"}`
      );
      console.log("----------------------------------------");

      // ---------------------------------------------
      // Skip rows that cannot currently be researched
      // ---------------------------------------------

      if (!businessName || !websiteRaw) {
        console.log(
          "[CSV BATCH] SKIPPED - Missing business name or website"
        );

        results.push({
          businessName: businessName || null,
          website: websiteRaw || null,
          success: false,
          status: "skipped",
          error: "Missing business name or website",
        });

        continue;
      }

      try {
        const website = normalizeWebsite(websiteRaw);

        console.log(
          `[CSV BATCH] Normalized website: ${website}`
        );

        // -------------------------------------------
        // Chromium / crawler verification
        // -------------------------------------------

        const result = await verifyBusiness(
          businessName,
          website
        );

        // -------------------------------------------
        // Save verification result to PostgreSQL
        // -------------------------------------------

        const saved = await saveVerificationResult({
          businessName,
          website,
          result,
        });

        console.log(
          `[CSV BATCH] Completed: ${businessName}`
        );

        console.log(
          `[CSV BATCH] Confidence: ${result.confidence ?? 0}`
        );

        console.log(
          `[CSV BATCH] Status: ${result.status || "unknown"}`
        );

        results.push({
          businessName,
          website,
          success: true,
          result,
          saved,
        });
      } catch (businessError) {
        console.error(
          `[CSV BATCH] FAILED: ${businessName}`
        );

        console.error(
          `[CSV BATCH] Reason: ${businessError.message}`
        );

        // Important:
        // One failed company does NOT stop the entire batch.

        results.push({
          businessName,
          website: websiteRaw,
          success: false,
          status: "failed",
          error: businessError.message,
        });
      }
    }

    // =================================================
    // BATCH SUMMARY
    // =================================================

    const completed = results.filter(
      (item) => item.success
    ).length;

    const skipped = results.filter(
      (item) => item.status === "skipped"
    ).length;

    const failed = results.filter(
      (item) => item.status === "failed"
    ).length;

    console.log("\n========================================");
    console.log("[CSV BATCH] VERIFICATION COMPLETE");
    console.log(
      `[CSV BATCH] Total: ${businesses.length}`
    );
    console.log(`[CSV BATCH] Completed: ${completed}`);
    console.log(`[CSV BATCH] Skipped: ${skipped}`);
    console.log(`[CSV BATCH] Failed: ${failed}`);
    console.log("========================================\n");

    res.json({
      success: true,
      source: "BusinessDatasets.csv",
      total: businesses.length,
      completed,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "[CSV BATCH] Batch verification error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// VERIFICATION HISTORY
// =====================================================

router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        vr.verification_id,
        b.business_name,
        b.website,
        vr.verification_status,
        vr.confidence_score,
        vr.discrepancies,
        vr.verified_at
      FROM verification_records vr
      JOIN businesses b
        ON vr.business_id = b.business_id
      ORDER BY vr.verified_at DESC
      LIMIT 50
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error(
      "[HISTORY] Verification history error:",
      error
    );

    res.status(500).json({
      error: "Failed to load verification history",
    });
  }
});

module.exports = router;
