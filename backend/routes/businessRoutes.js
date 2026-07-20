const express = require("express");
const router = express.Router();
const pool = require("../services/db");

function normalizeWebsite(website) {
  if (!website) return null;

  const cleaned = String(website).trim();

  if (!cleaned) return null;

  return /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
}

function normalizeBusinessStatus(status) {
  const allowedStatuses = [
    "Unverified",
    "Verified",
    "Needs Review",
    "Active",
    "Pending",
    "Inactive",
    "Imported",
    "Imported From Document"
  ];

  if (!status) {
    return "Unverified";
  }

  const match = allowedStatuses.find(
    (allowedStatus) =>
      allowedStatus.toLowerCase() ===
      String(status).trim().toLowerCase()
  );

  return match || "Unverified";
}

function getBusinessPayload(body = {}) {
  return {
    business_name:
      body.business_name ||
      body.businessName ||
      body.name ||
      null,

    website: normalizeWebsite(
      body.website ||
      body.business_website ||
      body.businessWebsite
    ),

    phone_number:
      body.phone_number ||
      body.phoneNumber ||
      body.phone ||
      null,

    email:
      body.email ||
      body.business_email ||
      body.businessEmail ||
      null,

    industry:
      body.industry ||
      body.business_industry ||
      null,

    business_status: normalizeBusinessStatus(
      body.business_status ||
      body.businessStatus ||
      body.status
    )
  };
}

function isValidBusinessId(id) {
  return /^\d+$/.test(String(id));
}

function sendDatabaseError(res, error, message) {
  console.error(message, {
    message: error.message,
    code: error.code,
    detail: error.detail,
    table: error.table,
    column: error.column,
    constraint: error.constraint
  });

  return res.status(500).json({
    success: false,
    error: message,
    database_code: error.code || null,
    database_detail: error.detail || null
  });
}

// GET all businesses
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          business_id,
          business_name,
          website,
          phone_number,
          email,
          industry,
          business_status,
          created_at,
          updated_at
       FROM businesses
       ORDER BY business_id ASC`
    );

    return res.json({
      success: true,
      count: result.rows.length,
      businesses: result.rows
    });
  } catch (error) {
    return sendDatabaseError(
      res,
      error,
      "Failed to load businesses"
    );
  }
});

// GET one business by ID
router.get("/:id", async (req, res) => {
  const businessId = req.params.id;

  if (!isValidBusinessId(businessId)) {
    return res.status(400).json({
      success: false,
      error: "Business ID must be a number"
    });
  }

  try {
    const result = await pool.query(
      `SELECT
          business_id,
          business_name,
          website,
          phone_number,
          email,
          industry,
          business_status,
          created_at,
          updated_at
       FROM businesses
       WHERE business_id = $1`,
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Business not found"
      });
    }

    return res.json({
      success: true,
      business: result.rows[0]
    });
  } catch (error) {
    return sendDatabaseError(
      res,
      error,
      "Failed to load business"
    );
  }
});

// CREATE business
router.post("/", async (req, res) => {
  const business = getBusinessPayload(req.body);

  if (!business.business_name) {
    return res.status(400).json({
      success: false,
      error: "business_name is required"
    });
  }

  try {
    const existing = await pool.query(
      `SELECT business_id
       FROM businesses
       WHERE LOWER(TRIM(business_name)) =
             LOWER(TRIM($1))
          OR (
            $2::text IS NOT NULL
            AND website = $2
          )
       LIMIT 1`,
      [
        business.business_name,
        business.website
      ]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Business already exists",
        business_id: existing.rows[0].business_id
      });
    }

    const result = await pool.query(
      `INSERT INTO businesses (
          business_name,
          website,
          phone_number,
          email,
          industry,
          business_status
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        business.business_name,
        business.website,
        business.phone_number,
        business.email,
        business.industry,
        business.business_status
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Business created",
      business: result.rows[0]
    });
  } catch (error) {
    return sendDatabaseError(
      res,
      error,
      "Failed to create business"
    );
  }
});

// UPDATE business
router.put("/:id", async (req, res) => {
  const businessId = req.params.id;

  if (!isValidBusinessId(businessId)) {
    return res.status(400).json({
      success: false,
      error: "Business ID must be a number"
    });
  }

  const business = getBusinessPayload(req.body);

  if (!business.business_name) {
    return res.status(400).json({
      success: false,
      error: "business_name is required"
    });
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
        business.business_name,
        business.website,
        business.phone_number,
        business.email,
        business.industry,
        business.business_status,
        businessId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Business not found"
      });
    }

    return res.json({
      success: true,
      message: "Business updated",
      business: result.rows[0]
    });
  } catch (error) {
    return sendDatabaseError(
      res,
      error,
      "Failed to update business"
    );
  }
});

// PARTIAL UPDATE business
router.patch("/:id", async (req, res) => {
  const businessId = req.params.id;

  if (!isValidBusinessId(businessId)) {
    return res.status(400).json({
      success: false,
      error: "Business ID must be a number"
    });
  }

  try {
    const existingResult = await pool.query(
      `SELECT *
       FROM businesses
       WHERE business_id = $1`,
      [businessId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Business not found"
      });
    }

    const existingBusiness = existingResult.rows[0];

    const mergedBusiness = getBusinessPayload({
      business_name:
        req.body.business_name ??
        req.body.businessName ??
        req.body.name ??
        existingBusiness.business_name,

      website:
        req.body.website ??
        req.body.business_website ??
        req.body.businessWebsite ??
        existingBusiness.website,

      phone_number:
        req.body.phone_number ??
        req.body.phoneNumber ??
        req.body.phone ??
        existingBusiness.phone_number,

      email:
        req.body.email ??
        req.body.business_email ??
        req.body.businessEmail ??
        existingBusiness.email,

      industry:
        req.body.industry ??
        req.body.business_industry ??
        existingBusiness.industry,

      business_status:
        req.body.business_status ??
        req.body.businessStatus ??
        req.body.status ??
        existingBusiness.business_status
    });

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
        mergedBusiness.business_name,
        mergedBusiness.website,
        mergedBusiness.phone_number,
        mergedBusiness.email,
        mergedBusiness.industry,
        mergedBusiness.business_status,
        businessId
      ]
    );

    return res.json({
      success: true,
      message: "Business updated",
      business: result.rows[0]
    });
  } catch (error) {
    return sendDatabaseError(
      res,
      error,
      "Failed to partially update business"
    );
  }
});

// DELETE business
router.delete("/:id", async (req, res) => {
  const businessId = req.params.id;

  if (!isValidBusinessId(businessId)) {
    return res.status(400).json({
      success: false,
      error: "Business ID must be a number"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT *
       FROM businesses
       WHERE business_id = $1`,
      [businessId]
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        error: "Business not found"
      });
    }

    await client.query(
      `DELETE FROM notifications
       WHERE business_id = $1`,
      [businessId]
    );

    await client.query(
      `DELETE FROM activity_logs
       WHERE related_business_id = $1`,
      [businessId]
    );

    await client.query(
      `DELETE FROM workflow_tasks
       WHERE business_id = $1`,
      [businessId]
    );

    await client.query(
      `DELETE FROM verification_records
       WHERE business_id = $1`,
      [businessId]
    );

    const deleted = await client.query(
      `DELETE FROM businesses
       WHERE business_id = $1
       RETURNING *`,
      [businessId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Business deleted",
      deleted_business: deleted.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");

    return sendDatabaseError(
      res,
      error,
      "Failed to delete business"
    );
  } finally {
    client.release();
  }
});

module.exports = router;
