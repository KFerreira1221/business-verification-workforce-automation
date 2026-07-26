const express = require("express");
const router = express.Router();

const pool = require("../services/db");
const { verifyBusiness } = require("../services/crawlerService");

const {
  normalizeWebsite,
  saveVerificationResult,
} = require("../services/verificationTrackingService");


// =====================================================
// HELPER: VERIFY + SAVE ONE BUSINESS
// =====================================================

async function verifyAndSaveBusiness(business) {
  const businessName = business.business_name;
  const website = normalizeWebsite(business.website);

  if (!businessName) {
    throw new Error("Business name is missing");
  }

  if (!website) {
    throw new Error("Business website is missing");
  }

  console.log("\n========================================");
  console.log("[VERIFY]");
  console.log(`[VERIFY] Business: ${businessName}`);
  console.log(`[VERIFY] Website: ${website}`);
  console.log("========================================\n");

  // Run Chromium / crawler
  const result = await verifyBusiness(
    businessName,
    website
  );

  // Save result to PostgreSQL
  const saved = await saveVerificationResult({
    businessName,
    website,
    result,
  });

  return {
    business_id: business.business_id,
    businessName,
    website,
    result,
    saved,
  };
}


// =====================================================
// LIVE CRAWLER TEST
//
// This stays here permanently as a diagnostic.
// It proves Chromium + screenshot + extraction work.
//
// DOES NOT SAVE MICROSOFT TO DATABASE.
// =====================================================

router.post("/run-test", async (req, res) => {
  try {
    const businessName = "Microsoft";
    const website = "https://www.microsoft.com";

    console.log("\n========================================");
    console.log("[CRAWLER TEST] Starting live test");
    console.log(`[CRAWLER TEST] Business: ${businessName}`);
    console.log(`[CRAWLER TEST] Website: ${website}`);
    console.log("========================================\n");

    const result = await verifyBusiness(
      businessName,
      website
    );

    return res.json({
      success: true,
      testMode: true,
      message:
        "Live Chromium crawler test completed.",
      result,
    });

  } catch (error) {
    console.error(
      "[CRAWLER TEST] Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// VERIFY ONE MANUALLY PROVIDED BUSINESS
//
// POST /api/verification/run
//
// Body:
// {
//   "businessName": "Example",
//   "website": "https://example.com"
// }
// =====================================================

router.post("/run", async (req, res) => {
  try {
    const {
      businessName,
      website,
    } = req.body;

    if (!businessName || !website) {
      return res.status(400).json({
        success: false,
        error:
          "businessName and website are required",
      });
    }

    const normalizedWebsite =
      normalizeWebsite(website);

    console.log("\n========================================");
    console.log("[VERIFY] Manual verification");
    console.log(`[VERIFY] Business: ${businessName}`);
    console.log(
      `[VERIFY] Website: ${normalizedWebsite}`
    );
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

    return res.json({
      success: true,
      result,
      saved,
    });

  } catch (error) {
    console.error(
      "[VERIFY] Manual verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// GET NEXT BUSINESS THAT NEEDS VERIFICATION
//
// GET /api/verification/next
//
// IMPORTANT:
// Reads PostgreSQL, NOT BusinessDatasets.csv
// =====================================================

router.get("/next", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.business_id,
        b.business_name,
        b.website,
        b.phone_number,
        b.email,
        b.industry,
        b.business_status

      FROM businesses b

      WHERE
        b.website IS NOT NULL

        AND TRIM(b.website) <> ''

        AND NOT EXISTS (
          SELECT 1
          FROM verification_results vr
          WHERE vr.business_id = b.business_id
        )

      ORDER BY b.business_id ASC

      LIMIT 1
      `
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        complete: true,
        message:
          "No unverified businesses remain.",
        business: null,
      });
    }

    return res.json({
      success: true,
      complete: false,
      business: result.rows[0],
    });

  } catch (error) {
    console.error(
      "[NEXT] Failed to get next business:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// VERIFY NEXT LOADED BUSINESS
//
// POST /api/verification/run-next
//
// THIS IS THE IMPORTANT BRIDGE:
//
// Load All Project Data
//        ↓
// PostgreSQL
//        ↓
// run-next
//        ↓
// Chromium
//        ↓
// verification_results
// =====================================================

router.post("/run-next", async (req, res) => {
  try {
    const databaseResult = await pool.query(
      `
      SELECT
        b.business_id,
        b.business_name,
        b.website,
        b.phone_number,
        b.email,
        b.industry,
        b.business_status

      FROM businesses b

      WHERE
        b.website IS NOT NULL

        AND TRIM(b.website) <> ''

        AND NOT EXISTS (
          SELECT 1
          FROM verification_results vr
          WHERE vr.business_id = b.business_id
        )

      ORDER BY b.business_id ASC

      LIMIT 1
      `
    );

    if (databaseResult.rows.length === 0) {
      return res.json({
        success: true,
        complete: true,
        message:
          "No unverified businesses remain.",
      });
    }

    const business =
      databaseResult.rows[0];

    console.log("\n========================================");
    console.log("[RUN NEXT]");
    console.log(
      `[RUN NEXT] Database business ID: ${business.business_id}`
    );
    console.log(
      `[RUN NEXT] Business: ${business.business_name}`
    );
    console.log(
      `[RUN NEXT] Website: ${business.website}`
    );
    console.log("========================================\n");

    const verification =
      await verifyAndSaveBusiness(
        business
      );

    return res.json({
      success: true,

      source:
        "PostgreSQL businesses table",

      message:
        "Loaded business verified successfully.",

      business,

      result:
        verification.result,

      saved:
        verification.saved,
    });

  } catch (error) {
    console.error(
      "[RUN NEXT] Verification failed:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================================================
// VERIFY ALL LOADED BUSINESSES
//
// POST /api/verification/run-loaded
//
// IMPORTANT:
// This reads from PostgreSQL.
//
// It DOES NOT read BusinessDatasets.csv directly.
// =====================================================

router.post(
  "/run-loaded",
  async (req, res) => {

    try {

      // -----------------------------------------------
      // GET BUSINESSES THAT HAVE NOT BEEN VERIFIED
      // -----------------------------------------------

      const databaseResult =
        await pool.query(
          `
          SELECT
            b.business_id,
            b.business_name,
            b.website,
            b.phone_number,
            b.email,
            b.industry,
            b.business_status

          FROM businesses b

          WHERE NOT EXISTS (
            SELECT 1
            FROM verification_results vr
            WHERE vr.business_id = b.business_id
          )

          ORDER BY b.business_id ASC
          `
        );


      const businesses =
        databaseResult.rows;


      if (!businesses.length) {
        return res.json({
          success: true,
          complete: true,
          total: 0,
          completed: 0,
          skipped: 0,
          failed: 0,
          message:
            "No unverified businesses remain.",
          results: [],
        });
      }


      console.log("\n========================================");
      console.log(
        "[DATABASE BATCH] Starting verification"
      );
      console.log(
        `[DATABASE BATCH] Records: ${businesses.length}`
      );
      console.log("========================================\n");


      const results = [];


      // -----------------------------------------------
      // PROCESS EACH BUSINESS
      // -----------------------------------------------

      for (
        let index = 0;
        index < businesses.length;
        index++
      ) {

        const business =
          businesses[index];


        console.log("\n----------------------------------------");
        console.log(
          `[DATABASE BATCH] ${index + 1} / ${businesses.length}`
        );
        console.log(
          `[DATABASE BATCH] ${business.business_name}`
        );
        console.log(
          `[DATABASE BATCH] ${business.website || "NO WEBSITE"}`
        );
        console.log("----------------------------------------");


        // ---------------------------------------------
        // MISSING BUSINESS NAME
        // ---------------------------------------------

        if (!business.business_name) {

          results.push({
            business_id:
              business.business_id,

            success: false,

            status: "skipped",

            error:
              "Business name is missing",
          });

          continue;
        }


        // ---------------------------------------------
        // MISSING WEBSITE
        //
        // For now we skip it.
        // Later SearXNG will discover the website.
        // ---------------------------------------------

        if (!business.website) {

          console.log(
            `[DATABASE BATCH] SKIPPED: ${business.business_name} has no website`
          );

          results.push({
            business_id:
              business.business_id,

            businessName:
              business.business_name,

            success: false,

            status: "skipped",

            reason:
              "missing_website",

            error:
              "No website currently stored for this business",
          });

          continue;
        }


        // ---------------------------------------------
        // VERIFY
        // ---------------------------------------------

        try {

          const verification =
            await verifyAndSaveBusiness(
              business
            );


          results.push({
            success: true,

            status:
              "completed",

            ...verification,
          });


          console.log(
            `[DATABASE BATCH] COMPLETE: ${business.business_name}`
          );


        } catch (businessError) {

          console.error(
            `[DATABASE BATCH] FAILED: ${business.business_name}`
          );

          console.error(
            `[DATABASE BATCH] ${businessError.message}`
          );


          // One failed company does NOT stop batch.

          results.push({
            business_id:
              business.business_id,

            businessName:
              business.business_name,

            website:
              business.website,

            success: false,

            status:
              "failed",

            error:
              businessError.message,
          });
        }
      }


      // -----------------------------------------------
      // SUMMARY
      // -----------------------------------------------

      const completed =
        results.filter(
          (item) =>
            item.status ===
            "completed"
        ).length;


      const skipped =
        results.filter(
          (item) =>
            item.status ===
            "skipped"
        ).length;


      const failed =
        results.filter(
          (item) =>
            item.status ===
            "failed"
        ).length;


      console.log("\n========================================");
      console.log(
        "[DATABASE BATCH] COMPLETE"
      );
      console.log(
        `[DATABASE BATCH] Total: ${businesses.length}`
      );
      console.log(
        `[DATABASE BATCH] Completed: ${completed}`
      );
      console.log(
        `[DATABASE BATCH] Skipped: ${skipped}`
      );
      console.log(
        `[DATABASE BATCH] Failed: ${failed}`
      );
      console.log("========================================\n");


      return res.json({
        success: true,

        source:
          "PostgreSQL businesses table",

        total:
          businesses.length,

        completed,

        skipped,

        failed,

        results,
      });


    } catch (error) {

      console.error(
        "[DATABASE BATCH] Fatal error:",
        error
      );


      return res.status(500).json({
        success: false,
        error:
          error.message,
      });
    }
  }
);


// =====================================================
// LIST BUSINESSES WAITING FOR VERIFICATION
//
// GET /api/verification/pending
// =====================================================

router.get("/pending", async (req, res) => {
  try {

    const result =
      await pool.query(
        `
        SELECT
          b.business_id,
          b.business_name,
          b.website,
          b.phone_number,
          b.email,
          b.industry,
          b.business_status

        FROM businesses b

        WHERE NOT EXISTS (
          SELECT 1

          FROM verification_results vr

          WHERE
            vr.business_id =
            b.business_id
        )

        ORDER BY
          b.business_id ASC
        `
      );


    return res.json({
      success: true,
      count:
        result.rows.length,
      businesses:
        result.rows,
    });


  } catch (error) {

    console.error(
      "[PENDING] Error:",
      error
    );


    return res.status(500).json({
      success: false,
      error:
        error.message,
    });
  }
});


// =====================================================
// VERIFICATION HISTORY
//
// GET /api/verification/history
// =====================================================

router.get("/history", async (req, res) => {
  try {

    const result =
      await pool.query(
        `
        SELECT
          vr.verification_id,

          b.business_id,
          b.business_name,
          b.website,

          vr.website_verified,
          vr.email_verified,
          vr.phone_verified,

          vr.verification_status,
          vr.confidence_score,

          vr.discrepancies,
          vr.notes,

          vr.verified_at

        FROM verification_results vr

        JOIN businesses b
          ON vr.business_id =
             b.business_id

        ORDER BY
          vr.verified_at DESC

        LIMIT 100
        `
      );


    return res.json({
      success: true,
      count:
        result.rows.length,
      results:
        result.rows,
    });


  } catch (error) {

    console.error(
      "[HISTORY] Error:",
      error
    );


    return res.status(500).json({
      success: false,
      error:
        "Failed to load verification history",
      detail:
        error.message,
    });
  }
});


module.exports = router;
