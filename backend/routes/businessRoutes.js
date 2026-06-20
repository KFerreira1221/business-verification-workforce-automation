const express = require("express");
const router = express.Router();
const pool = require("../services/db");

// GET all businesses
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM businesses ORDER BY business_id"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// GET one business
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM businesses WHERE business_id = $1",
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// CREATE business
router.post("/", async (req, res) => {
  const {
    business_name,
    website,
    phone_number,
    email,
    industry,
    status
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO businesses
      (business_name, website, phone_number, email, industry, status)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        business_name,
        website,
        phone_number,
        email,
        industry,
        status
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Insert failed" });
  }
});

// UPDATE business
router.put("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE businesses
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $2
       RETURNING *`,
      [req.body.status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE business
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM businesses WHERE business_id = $1",
      [req.params.id]
    );

    res.json({
      success: true,
      message: "Business deleted"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
