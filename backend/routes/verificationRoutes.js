const express = require("express");
const router = express.Router();
const pool = require("../services/db");
const { loadBusinesses } = require("../services/csvService");
const { verifyBusiness } = require("../services/crawlerService");

function normalizeWebsite(website) {
  if (!website) return null;
  return website.startsWith("http") ? website : `https://${website}`;
}

function mapVerificationStatus(result) {
  return result.status === "verified" ? "Verified" : "Needs Review";
}

async function getOrCreateVerificationSource(client) {
  const existing = await client.query(
    "SELECT source_id FROM data_sources WHERE source_name = $1 LIMIT 1",
    ["Website Verification Engine"]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].source_id;
  }

  const created = await client.query(
    `INSERT INTO data_sources (source_name, source_type, source_url, reliability_score)
     VALUES ($1, $2, $3, $4)
     RETURNING source_id`,
    ["Website Verification Engine", "Automated Web Check", null, 0.90]
  );

  return created.rows[0].source_id;
}

async function saveVerificationResult({ businessName, website, result }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const normalizedWebsite = normalizeWebsite(website);
    const verificationStatus = mapVerificationStatus(result);

    let businessResult = await client.query(
      `SELECT business_id FROM businesses
       WHERE LOWER(business_name) = LOWER($1)
          OR website = $2
       LIMIT 1`,
      [businessName, normalizedWebsite]
    );

    let businessId;

    if (businessResult.rows.length === 0) {
      const createdBusiness = await client.query(
        `INSERT INTO businesses (business_name, website, business_status)
         VALUES ($1, $2, $3)
         RETURNING business_id`,
        [businessName, normalizedWebsite, verificationStatus]
      );
      businessId = createdBusiness.rows[0].business_id;
    } else {
      businessId = businessResult.rows[0].business_id;
      await client.query(
        `UPDATE businesses
         SET website = COALESCE($1, website),
             business_status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $3`,
        [normalizedWebsite, verificationStatus, businessId]
      );
    }

    const sourceId = await getOrCreateVerificationSource(client);

    const verificationRecord = await client.query(
      `INSERT INTO verification_records (
          business_id,
          source_id,
          verified_name,
          verified_website,
          verification_status,
          confidence_score,
          discrepancies
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        businessId,
        sourceId,
        result.businessName || businessName,
        result.website || normalizedWebsite,
        verificationStatus,
        result.confidence,
        verificationStatus === "Verified"
          ? null
          : "Business needs manual review because confidence score was below verification threshold."
      ]
    );


    const taskStatus = verificationStatus === "Verified" ? "Completed" : "Pending";
    const taskName = verificationStatus === "Verified"
      ? "Verification completed"
      : "Manual review required";
    const taskType = verificationStatus === "Verified"
      ? "Verification"
      : "Manual Review";
    const dueDate = verificationStatus === "Verified" ? null : "CURRENT_DATE + INTERVAL '3 days'";

    if (verificationStatus === "Verified") {
      await client.query(
        `INSERT INTO workflow_tasks (
            business_id,
            task_name,
            task_type,
            task_status,
            assigned_to,
            completed_at
         )
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [businessId, taskName, taskType, taskStatus, "AI Verification Engine"]
      );
    } else {
      await client.query(
        `INSERT INTO workflow_tasks (
            business_id,
            task_name,
            task_type,
            task_status,
            assigned_to,
            due_date
         )
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '3 days')`,
        [businessId, taskName, taskType, taskStatus, "Kevin Ferreira"]
      );
    }

    await client.query(
      `INSERT INTO activity_logs (
          action_type,
          description,
          related_business_id,
          created_by
       )
       VALUES ($1, $2, $3, $4)`,
      [
        "VERIFY",
        `${businessName} verification completed with status: ${verificationStatus} and confidence score: ${result.confidence}.`,
        businessId,
        "AI Verification Engine"
      ]
    );

    await client.query("COMMIT");

    return {
      business_id: businessId,
      verification_record: verificationRecord.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

router.post("/run", async (req, res) => {
  try {
    const { businessName, website } = req.body;

    if (!businessName || !website) {
      return res.status(400).json({
        success: false,
        error: "businessName and website are required"
      });
    }

    const normalizedWebsite = normalizeWebsite(website);
    const result = await verifyBusiness(businessName, normalizedWebsite);
    const saved = await saveVerificationResult({
      businessName,
      website: normalizedWebsite,
      result
    });

    res.json({
      success: true,
      result,
      saved
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post("/run-csv-first", async (req, res) => {
  try {
    const businesses = await loadBusinesses();
    const firstBusiness = businesses[0];

    const websiteRaw =
      firstBusiness.website ||
      firstBusiness.Website ||
      firstBusiness.business_website ||
      firstBusiness.BusinessWebsite;

    const businessName =
      firstBusiness.business_name ||
      firstBusiness.BusinessName ||
      firstBusiness.name ||
      firstBusiness.Name;

    if (!businessName || !websiteRaw) {
      return res.status(400).json({
        success: false,
        error: "CSV row must include a business name and website"
      });
    }

    const website = normalizeWebsite(websiteRaw);
    const result = await verifyBusiness(businessName, website);
    const saved = await saveVerificationResult({ businessName, website, result });

    res.json({
      success: true,
      source: "BusinessDatasets.csv",
      scannedBusiness: firstBusiness,
      result,
      saved
    });
  } catch (error) {
    console.error("CSV verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          vr.verification_id,
          b.business_name,
          b.website,
          vr.verification_status,
          vr.confidence_score,
          vr.discrepancies,
          vr.verified_at
       FROM verification_records vr
       JOIN businesses b ON vr.business_id = b.business_id
       ORDER BY vr.verified_at DESC
       LIMIT 50`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Verification history error:", error);
    res.status(500).json({ error: "Failed to load verification history" });
  }
});

module.exports = router;
