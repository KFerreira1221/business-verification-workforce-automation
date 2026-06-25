const express = require("express");
const router = express.Router();
const pool = require("../services/db");

// GET all businesses
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM businesses ORDER BY business_id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/businesses error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// GET one business by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM businesses WHERE business_id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /api/businesses/:id error:", error);
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
    business_status
  } = req.body;

  if (!business_name) {
    return res.status(400).json({ error: "business_name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO businesses
       (business_name, website, phone_number, email, industry, business_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        business_name,
        website || null,
        phone_number || null,
        email || null,
        industry || null,
        business_status || "Unverified"
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/businesses error:", error);
    res.status(500).json({ error: "Insert failed" });
  }
});

// UPDATE business
router.put("/:id", async (req, res) => {
  const {
    business_name,
    website,
    phone_number,
    email,
    industry,
    business_status
  } = req.body;

  if (!business_name) {
    return res.status(400).json({ error: "business_name is required" });
  }

  try {
    const result = await pool.query(
      `UPDATE businesses
       SET
         business_name = $1,
         website = $2,
         phone_number = $3,
         email = $4,
         industry = $5,
         business_status = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $7
       RETURNING *`,
      [
        business_name,
        website || null,
        phone_number || null,
        email || null,
        industry || null,
        business_status || "Unverified",
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/businesses/:id error:", error);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE business
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM businesses WHERE business_id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json({
      success: true,
      message: "Business deleted",
      deleted_business: result.rows[0]
    });
  } catch (error) {
    console.error("DELETE /api/businesses/:id error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
