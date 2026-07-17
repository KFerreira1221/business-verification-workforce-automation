const express = require("express");
const router = express.Router();
const pool = require("../services/db");
const { verifyBusiness } = require("../services/crawlerService");
const { normalizeWebsite, saveVerificationResult } = require("../services/verificationTrackingService");

// GET /api/queue?status=Waiting
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const values = [];
    let where = "";
    if (status) {
      values.push(status);
      where = "WHERE vq.queue_status = $1";
    }
    const result = await pool.query(
      `SELECT vq.*, b.business_status
       FROM verification_queue vq
       LEFT JOIN businesses b ON vq.business_id = b.business_id
       ${where}
       ORDER BY
         CASE vq.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END,
         vq.created_at ASC`, values
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Queue list error:", error);
    res.status(500).json({ error: "Failed to load verification queue" });
  }
});

// POST /api/queue
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { business_id, businessName, website, priority = "Normal", requested_by = "Dashboard User" } = req.body;
    if (!businessName || !website) return res.status(400).json({ error: "businessName and website are required" });

    await client.query("BEGIN");
    const normalizedWebsite = normalizeWebsite(website);
    const result = await client.query(
      `INSERT INTO verification_queue
        (business_id, business_name, website, priority, requested_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [business_id || null, businessName, normalizedWebsite, priority, requested_by]
    );
    await client.query(
      `INSERT INTO activity_logs (action_type, description, related_business_id, created_by)
       VALUES ('QUEUE', $1, $2, $3)`,
      [`Verification queued for ${businessName}.`, business_id || null, requested_by]
    );
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Queue create error:", error);
    res.status(500).json({ error: "Failed to add verification to queue", details: error.message });
  } finally { client.release(); }
});

// POST /api/queue/:id/process
router.post("/:id/process", async (req, res) => {
  const { id } = req.params;
  try {
    const claimed = await pool.query(
      `UPDATE verification_queue
       SET queue_status = 'Running', started_at = CURRENT_TIMESTAMP, error_message = NULL
       WHERE queue_id = $1 AND queue_status = 'Waiting'
       RETURNING *`, [id]
    );
    if (claimed.rows.length === 0) return res.status(409).json({ error: "Queue item was not found or is not waiting" });

    const job = claimed.rows[0];
    try {
      const result = await verifyBusiness(job.business_name, job.website);
      const saved = await saveVerificationResult({ businessName: job.business_name, website: job.website, result });
      const completed = await pool.query(
        `UPDATE verification_queue
         SET queue_status = 'Completed', business_id = $1, completed_at = CURRENT_TIMESTAMP
         WHERE queue_id = $2 RETURNING *`, [saved.business_id, id]
      );
      res.json({ success: true, queue: completed.rows[0], result, saved });
    } catch (processingError) {
      await pool.query(
        `UPDATE verification_queue
         SET queue_status = 'Failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
         WHERE queue_id = $2`, [processingError.message, id]
      );
      await pool.query(
        `INSERT INTO notifications (business_id, notification_type, title, message, severity)
         VALUES ($1, 'QUEUE', 'Verification job failed', $2, 'Error')`,
        [job.business_id, `${job.business_name}: ${processingError.message}`]
      );
      throw processingError;
    }
  } catch (error) {
    console.error("Queue process error:", error);
    res.status(500).json({ success: false, error: "Failed to process queue item", details: error.message });
  }
});

// PATCH /api/queue/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE verification_queue
       SET queue_status = 'Cancelled', completed_at = CURRENT_TIMESTAMP
       WHERE queue_id = $1 AND queue_status = 'Waiting'
       RETURNING *`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Waiting queue item not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel queue item" });
  }
});

module.exports = router;
