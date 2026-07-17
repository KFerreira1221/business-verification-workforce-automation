const pool = require("./db");

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

  if (existing.rows.length > 0) return existing.rows[0].source_id;

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
          business_id, source_id, verified_name, verified_website,
          verification_status, confidence_score, discrepancies
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
          : "Business needs manual review because confidence was below the verification threshold."
      ]
    );

    if (verificationStatus === "Verified") {
      await client.query(
        `INSERT INTO workflow_tasks
          (business_id, task_name, task_type, task_status, assigned_to, completed_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [businessId, "Verification completed", "Verification", "Completed", "AI Verification Engine"]
      );
    } else {
      await client.query(
        `INSERT INTO workflow_tasks
          (business_id, task_name, task_type, task_status, assigned_to, due_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '3 days')`,
        [businessId, "Manual review required", "Manual Review", "Pending", "Kevin Ferreira"]
      );
    }

    await client.query(
      `INSERT INTO activity_logs
        (action_type, description, related_business_id, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        "VERIFY",
        `${businessName} verification completed with status ${verificationStatus} and confidence ${result.confidence}.`,
        businessId,
        "AI Verification Engine"
      ]
    );

    await client.query(
      `INSERT INTO notifications
        (business_id, notification_type, title, message, severity)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        businessId,
        "VERIFICATION",
        verificationStatus === "Verified" ? "Verification complete" : "Manual review required",
        `${businessName} received status ${verificationStatus} with confidence ${result.confidence}.`,
        verificationStatus === "Verified" ? "Success" : "Warning"
      ]
    );

    await client.query("COMMIT");
    return { business_id: businessId, verification_record: verificationRecord.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { normalizeWebsite, mapVerificationStatus, saveVerificationResult };
