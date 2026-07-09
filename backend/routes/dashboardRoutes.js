const express = require("express");
const router = express.Router();
const pool = require("../services/db");

router.get("/stats", async (req, res) => {
  try {
    const totalBusinesses = await pool.query(
      "SELECT COUNT(*) FROM businesses"
    );

    const verifiedBusinesses = await pool.query(
      "SELECT COUNT(*) FROM verification_records WHERE verification_status = 'Verified'"
    );

    const pendingReviews = await pool.query(
      "SELECT COUNT(*) FROM verification_records WHERE verification_status = 'Pending'"
    );

    const documentsUploaded = await pool.query(
      "SELECT COUNT(*) FROM documents"
    );

    res.json({
      total_businesses: Number(totalBusinesses.rows[0].count),
      verified_businesses: Number(verifiedBusinesses.rows[0].count),
      pending_reviews: Number(pendingReviews.rows[0].count),
      documents_uploaded: Number(documentsUploaded.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

module.exports = router;