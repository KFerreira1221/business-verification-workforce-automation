const pool = require("./db");

function normalizeWebsite(website) {
  if (!website) return null;

  const cleanedWebsite = String(website).trim();

  if (!cleanedWebsite) return null;

  return /^https?:\/\//i.test(cleanedWebsite)
    ? cleanedWebsite
    : `https://${cleanedWebsite}`;
}

function mapVerificationStatus(result) {
  return result?.status === "verified" ? "Verified" : "Needs Review";
}

function buildDiscrepancyDetails(result) {
  const details = {
    reachable: result?.reachable ?? null,
    httpStatus: result?.httpStatus ?? null,
    errorType: result?.errorType ?? null,
    errorMessage: result?.errorMessage ?? null,
    finalUrl: result?.finalUrl ?? null,
    soft404: result?.soft404 ?? false,
    businessNameFound: result?.businessNameFound ?? false,
    phoneFound: result?.phoneFound ?? false,
    addressFound: result?.addressFound ?? false,
    screenshotAvailable: result?.screenshotAvailable ?? false,
    attempts: result?.attempts ?? []
  };

  return JSON.stringify(details);
}

async function getOrCreateVerificationSource(client) {
  const existing = await client.query(
    `SELECT source_id
     FROM data_sources
     WHERE source_name = $1
     LIMIT 1`,
    ["Website Verification Engine"]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].source_id;
  }

  const created = await client.query(
    `INSERT INTO data_sources (
        source_name,
        source_type,
        source_url,
        reliability_score
     )
     VALUES ($1, $2, $3, $4)
     RETURNING source_id`,
    [
      "Website Verification Engine",
      "Automated Web Check",
      null,
      0.9
    ]
  );

  return created.rows[0].source_id;
}

async function findExistingBusiness(
  client,
  businessName,
  normalizedWebsite
) {
  const result = await client.query(
    `SELECT
        business_id,
        business_name,
        website
     FROM businesses
     WHERE LOWER(TRIM(business_name)) = LOWER(TRIM($1))
        OR ($2::text IS NOT NULL AND website = $2)
     LIMIT 1`,
    [businessName, normalizedWebsite]
  );

  return result.rows[0] || null;
}

async function createBusiness(
  client,
  businessName,
  normalizedWebsite,
  verificationStatus
) {
  const result = await client.query(
    `INSERT INTO businesses (
        business_name,
        website,
        business_status
     )
     VALUES ($1, $2, $3)
     RETURNING business_id`,
    [
      businessName,
      normalizedWebsite,
      verificationStatus
    ]
  );

  return result.rows[0].business_id;
}

async function updateBusiness(
  client,
  businessId,
  normalizedWebsite,
  verificationStatus
) {
  await client.query(
    `UPDATE businesses
     SET website = COALESCE($1, website),
         business_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $3`,
    [
      normalizedWebsite,
      verificationStatus,
      businessId
    ]
  );
}

async function createWorkflowTask(
  client,
  businessId,
  verificationStatus
) {
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
      [
        businessId,
        "Verification completed",
        "Verification",
        "Completed",
        "AI Verification Engine"
      ]
    );

    return;
  }

  await client.query(
    `INSERT INTO workflow_tasks (
        business_id,
        task_name,
        task_type,
        task_status,
        assigned_to,
        due_date
     )
     VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        CURRENT_DATE + INTERVAL '3 days'
     )`,
    [
      businessId,
      "Manual review required",
      "Manual Review",
      "Pending",
      "Kevin Ferreira"
    ]
  );
}

async function saveVerificationResult({
  businessName,
  website,
  result
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const normalizedWebsite = normalizeWebsite(
      result?.finalUrl || website
    );

    const verificationStatus = mapVerificationStatus(result);

    const confidenceScore = Number.isFinite(
      Number(result?.confidence)
    )
      ? Number(result.confidence)
      : 0;

    const existingBusiness = await findExistingBusiness(
      client,
      businessName,
      normalizedWebsite
    );

    let businessId;

    if (!existingBusiness) {
      businessId = await createBusiness(
        client,
        businessName,
        normalizedWebsite,
        verificationStatus
      );
    } else {
      businessId = existingBusiness.business_id;

      await updateBusiness(
        client,
        businessId,
        normalizedWebsite,
        verificationStatus
      );
    }

    const sourceId = await getOrCreateVerificationSource(client);

    const verifiedWebsite =
      result?.finalUrl ||
      result?.website ||
      normalizedWebsite;

    const verifiedPhone = result?.phoneFound
      ? "Phone found on public webpage"
      : null;

    const verifiedAddress = result?.addressFound
      ? "Address found on public webpage"
      : null;

    const discrepancies =
      verificationStatus === "Verified"
        ? null
        : buildDiscrepancyDetails(result);

    const verificationRecord = await client.query(
      `INSERT INTO verification_records (
          business_id,
          source_id,
          verified_name,
          verified_website,
          verified_phone,
          verified_address,
          verification_status,
          confidence_score,
          discrepancies
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
       )
       RETURNING *`,
      [
        businessId,
        sourceId,
        result?.businessName || businessName,
        verifiedWebsite,
        verifiedPhone,
        verifiedAddress,
        verificationStatus,
        confidenceScore,
        discrepancies
      ]
    );

    await createWorkflowTask(
      client,
      businessId,
      verificationStatus
    );

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
        `${businessName} verification completed with status ${verificationStatus} and confidence ${confidenceScore}.`,
        businessId,
        "AI Verification Engine"
      ]
    );

    await client.query(
      `INSERT INTO notifications (
          business_id,
          notification_type,
          title,
          message,
          severity
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        businessId,
        "VERIFICATION",
        verificationStatus === "Verified"
          ? "Verification complete"
          : "Manual review required",
        `${businessName} received status ${verificationStatus} with confidence ${confidenceScore}.`,
        verificationStatus === "Verified"
          ? "Success"
          : "Warning"
      ]
    );

    await client.query("COMMIT");

    return {
      business_id: businessId,
      verification_record:
        verificationRecord.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Failed to save verification result:",
      {
        businessName,
        website,
        error: error.message
      }
    );

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizeWebsite,
  mapVerificationStatus,
  saveVerificationResult
};
