const express = require("express");
const router = express.Router();
const pool = require("../services/db");

router.get("/", async (req, res) => {
  try {
    const { unreadOnly = "false", limit = "50" } = req.query;
    const onlyUnread = unreadOnly === "true";
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
    const result = await pool.query(
      `SELECT n.*, b.business_name
       FROM notifications n
       LEFT JOIN businesses b ON n.business_id = b.business_id
       WHERE ($1::boolean = FALSE OR n.is_read = FALSE)
       ORDER BY n.created_at DESC
       LIMIT $2`, [onlyUnread, safeLimit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Notification list error:", error);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS unread_count FROM notifications WHERE is_read = FALSE");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to load unread notification count" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE notification_id = $1 RETURNING *`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Notification not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE is_read = FALSE RETURNING notification_id`
    );
    res.json({ updated: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

module.exports = router;
