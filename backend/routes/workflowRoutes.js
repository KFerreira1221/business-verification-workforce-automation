const express = require("express");
const router = express.Router();
const pool = require("../services/db");

function calculateProgress(status) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return 100;
    case "in progress":
      return 60;
    case "pending":
      return 25;
    case "blocked":
      return 10;
    default:
      return 0;
  }
}

// GET /api/workflows/tasks
router.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          wt.task_id,
          wt.business_id,
          b.business_name,
          wt.task_name,
          wt.task_type,
          wt.task_status,
          wt.assigned_to,
          wt.due_date,
          wt.completed_at,
          calculate_workflow_progress(wt.task_status) AS progress_percentage
       FROM workflow_tasks wt
       LEFT JOIN businesses b ON wt.business_id = b.business_id
       ORDER BY wt.due_date ASC NULLS LAST, wt.task_id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Workflow task list error:", error);
    res.status(500).json({ error: "Failed to load workflow tasks" });
  }
});

// POST /api/workflows/tasks
router.post("/tasks", async (req, res) => {
  try {
    const { business_id, task_name, task_type, task_status, assigned_to, due_date } = req.body;

    if (!business_id || !task_name) {
      return res.status(400).json({ error: "business_id and task_name are required" });
    }

    const result = await pool.query(
      `INSERT INTO workflow_tasks (
          business_id,
          task_name,
          task_type,
          task_status,
          assigned_to,
          due_date
       )
       VALUES ($1, $2, $3, COALESCE($4, 'Pending'), $5, $6)
       RETURNING *`,
      [business_id, task_name, task_type || "General", task_status, assigned_to || "Unassigned", due_date || null]
    );

    await pool.query(
      `INSERT INTO activity_logs (action_type, description, related_business_id, created_by)
       VALUES ($1, $2, $3, $4)`,
      ["TASK", `Workflow task created: ${task_name}`, business_id, assigned_to || "System"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Workflow task create error:", error);
    res.status(500).json({ error: "Failed to create workflow task" });
  }
});

// PATCH /api/workflows/tasks/:id/status
router.patch("/tasks/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { task_status, assigned_to } = req.body;

    if (!task_status) {
      return res.status(400).json({ error: "task_status is required" });
    }

    const completedAt = task_status === "Completed" ? "CURRENT_TIMESTAMP" : "NULL";

    const result = await pool.query(
      `UPDATE workflow_tasks
       SET task_status = $1,
           assigned_to = COALESCE($2, assigned_to),
           completed_at = ${completedAt}
       WHERE task_id = $3
       RETURNING *`,
      [task_status, assigned_to || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow task not found" });
    }

    await pool.query(
      `INSERT INTO activity_logs (action_type, description, related_business_id, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        "STATUS_UPDATE",
        `Workflow task status updated to ${task_status}: ${result.rows[0].task_name}`,
        result.rows[0].business_id,
        assigned_to || "System"
      ]
    );

    res.json({
      ...result.rows[0],
      progress_percentage: calculateProgress(task_status)
    });
  } catch (error) {
    console.error("Workflow task status update error:", error);
    res.status(500).json({ error: "Failed to update workflow task status" });
  }
});

// GET /api/workflows/summary
router.get("/summary", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          task_status,
          COUNT(*) AS total
       FROM workflow_tasks
       GROUP BY task_status
       ORDER BY task_status`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Workflow summary error:", error);
    res.status(500).json({ error: "Failed to load workflow summary" });
  }
});

module.exports = router;
