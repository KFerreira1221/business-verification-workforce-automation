const express = require("express");
const router = express.Router();
const pool = require("../services/db");


// =====================================================
// DASHBOARD STATISTICS
// GET /api/dashboard/stats
// =====================================================

router.get("/stats", async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT

        -- =============================================
        -- BUSINESSES
        -- =============================================

        (
          SELECT COUNT(*)::int
          FROM businesses
        ) AS total_businesses,


        (
          SELECT COUNT(DISTINCT business_id)::int
          FROM verification_results
          WHERE verification_status = 'Verified'
        ) AS verified_businesses,


        (
          SELECT COUNT(DISTINCT business_id)::int
          FROM verification_results
          WHERE verification_status = 'Needs Review'
        ) AS needs_review,


        (
          SELECT COUNT(*)::int
          FROM businesses b
          WHERE NOT EXISTS (
            SELECT 1
            FROM verification_results vr
            WHERE vr.business_id = b.business_id
          )
        ) AS not_yet_verified,


        -- =============================================
        -- DOCUMENTS
        -- =============================================

        (
          SELECT COUNT(*)::int
          FROM documents
        ) AS documents_uploaded,


        -- =============================================
        -- WORKFLOW
        -- =============================================

        (
          SELECT COUNT(*)::int
          FROM workflow_tasks
          WHERE task_status = 'Pending'
        ) AS pending_tasks,


        -- =============================================
        -- VERIFICATION
        -- =============================================

        (
          SELECT ROUND(
            COALESCE(
              AVG(confidence_score),
              0
            ),
            2
          )
          FROM verification_results
        ) AS average_confidence,


        (
          SELECT COUNT(*)::int
          FROM verification_results
          WHERE verified_at >= CURRENT_DATE
        ) AS verifications_today,


        (
          SELECT COUNT(*)::int
          FROM verification_results
        ) AS total_verifications
      `
    );


    return res.json({
      success: true,
      stats: result.rows[0]
    });


  } catch (error) {

    console.error(
      "[DASHBOARD] Stats error:",
      error
    );


    return res.status(500).json({
      success: false,
      error:
        "Failed to load dashboard stats",
      details:
        error.message
    });
  }
});


// =====================================================
// RECENT ACTIVITY
// GET /api/dashboard/recent-activity
// =====================================================

router.get(
  "/recent-activity",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            log_id,
            action_type,
            description,
            created_at

          FROM activity_logs

          ORDER BY created_at DESC

          LIMIT 10
          `
        );


      return res.json({
        success: true,
        count: result.rows.length,
        activity: result.rows
      });


    } catch (error) {

      console.error(
        "[DASHBOARD] Recent activity error:",
        error
      );


      return res.status(500).json({
        success: false,
        error:
          "Failed to load recent activity",
        details:
          error.message
      });
    }
  }
);


// =====================================================
// RECENT VERIFICATIONS
// GET /api/dashboard/recent-verifications
// =====================================================

router.get(
  "/recent-verifications",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            vr.verification_id,
            vr.business_id,
            b.business_name,
            b.website,

            vr.website_verified,
            vr.email_verified,
            vr.phone_verified,

            vr.confidence_score,
            vr.verification_status,

            vr.discrepancies,
            vr.notes,
            vr.verified_at

          FROM verification_results vr

          JOIN businesses b
            ON b.business_id =
               vr.business_id

          ORDER BY
            vr.verified_at DESC

          LIMIT 10
          `
        );


      return res.json({
        success: true,
        count:
          result.rows.length,
        verifications:
          result.rows
      });


    } catch (error) {

      console.error(
        "[DASHBOARD] Recent verification error:",
        error
      );


      return res.status(500).json({
        success: false,
        error:
          "Failed to load recent verifications",
        details:
          error.message
      });
    }
  }
);


// =====================================================
// VERIFICATION SUMMARY
// GET /api/dashboard/verification-summary
// =====================================================

router.get(
  "/verification-summary",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            verification_status,
            COUNT(*)::int AS count

          FROM verification_results

          GROUP BY verification_status

          ORDER BY verification_status
          `
        );


      return res.json({
        success: true,
        summary:
          result.rows
      });


    } catch (error) {

      console.error(
        "[DASHBOARD] Verification summary error:",
        error
      );


      return res.status(500).json({
        success: false,
        error:
          "Failed to load verification summary",
        details:
          error.message
      });
    }
  }
);


module.exports = router;
