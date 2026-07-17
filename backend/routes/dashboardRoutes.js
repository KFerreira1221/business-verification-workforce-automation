const express = require("express");
const router = express.Router();
const pool = require("../services/db");

router.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM businesses) AS total_businesses,
        (SELECT COUNT(*)::int FROM businesses WHERE business_status = 'Verified') AS verified_businesses,
        (SELECT COUNT(*)::int FROM businesses WHERE business_status IN ('Pending', 'Needs Review', 'Unverified')) AS pending_reviews,
        (SELECT COUNT(*)::int FROM documents) AS documents_uploaded,
        (SELECT COUNT(*)::int FROM workflow_tasks WHERE task_status = 'Pending') AS pending_tasks,
        (SELECT COUNT(*)::int FROM verification_queue WHERE queue_status = 'Waiting') AS queued_verifications,
        (SELECT COUNT(*)::int FROM notifications WHERE is_read = FALSE) AS unread_notifications,
        (SELECT ROUND(COALESCE(AVG(confidence_score), 0), 2) FROM verification_records) AS average_confidence,
        (SELECT COUNT(*)::int FROM verification_records WHERE verified_at >= CURRENT_DATE) AS verifications_today`
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to load dashboard stats", details: error.message });
  }
});

router.get("/recent-activity", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, b.business_name
       FROM activity_logs al
       LEFT JOIN businesses b ON al.related_business_id = b.business_id
       ORDER BY al.created_at DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load recent activity" });
  }
});

module.exports = router;
