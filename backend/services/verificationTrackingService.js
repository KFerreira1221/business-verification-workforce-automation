const pool = require("./db");


// =====================================================
// NORMALIZE WEBSITE
// =====================================================

function normalizeWebsite(website) {
  if (!website) return null;

  const cleanedWebsite = String(website).trim();

  if (!cleanedWebsite) return null;

  return /^https?:\/\//i.test(cleanedWebsite)
    ? cleanedWebsite
    : `https://${cleanedWebsite}`;
}


// =====================================================
// MAP VERIFICATION STATUS
//
// This belongs in verification_results,
// NOT businesses.business_status.
// =====================================================

function mapVerificationStatus(result) {
  if (result?.status === "verified") {
    return "Verified";
  }

  if (result?.reachable === false) {
    return "Failed";
  }

  return "Needs Review";
}


// =====================================================
// BUILD DISCREPANCY DETAILS
// =====================================================

function buildDiscrepancyDetails(result) {
  const details = {
    reachable: result?.reachable ?? null,
    httpStatus: result?.httpStatus ?? null,
    errorType: result?.errorType ?? null,
    errorMessage: result?.errorMessage ?? null,
    finalUrl: result?.finalUrl ?? null,
    soft404: result?.soft404 ?? false,

    businessNameFound:
      result?.businessNameFound ?? false,

    phoneFound:
      result?.phoneFound ?? false,

    addressFound:
      result?.addressFound ?? false,

    screenshotAvailable:
      result?.screenshotAvailable ?? false,

    pagesCrawled:
      result?.pagesCrawled ?? 0,

    attempts:
      result?.attempts ?? []
  };

  return JSON.stringify(details);
}


// =====================================================
// FIND EXISTING BUSINESS
// =====================================================

async function findExistingBusiness(
  client,
  businessName,
  normalizedWebsite
) {
  const query = await client.query(
    `
    SELECT
      business_id,
      business_name,
      website,
      business_status

    FROM businesses

    WHERE
      LOWER(TRIM(business_name)) =
      LOWER(TRIM($1))

      OR (
        $2::text IS NOT NULL
        AND website = $2
      )

    LIMIT 1
    `,
    [
      businessName,
      normalizedWebsite
    ]
  );

  return query.rows[0] || null;
}


// =====================================================
// CREATE BUSINESS
//
// IMPORTANT:
// Business status and verification status are separate.
//
// business_status:
// Active / Pending / Inactive / Imported
//
// verification_status:
// Verified / Needs Review / Failed
// =====================================================

async function createBusiness(
  client,
  businessName,
  normalizedWebsite
) {
  const query = await client.query(
    `
    INSERT INTO businesses (
      business_name,
      website,
      business_status
    )

    VALUES (
      $1,
      $2,
      $3
    )

    RETURNING
      business_id,
      business_name,
      website,
      business_status
    `,
    [
      businessName,
      normalizedWebsite,
      "Pending"
    ]
  );

  return query.rows[0];
}


// =====================================================
// UPDATE EXISTING BUSINESS
//
// Do NOT overwrite business_status with
// "Verified" or "Needs Review".
// =====================================================

async function updateBusiness(
  client,
  businessId,
  normalizedWebsite
) {
  const query = await client.query(
    `
    UPDATE businesses

    SET
      website = COALESCE($1, website),
      updated_at = CURRENT_TIMESTAMP

    WHERE business_id = $2

    RETURNING
      business_id,
      business_name,
      website,
      business_status
    `,
    [
      normalizedWebsite,
      businessId
    ]
  );

  return query.rows[0];
}


// =====================================================
// CREATE WORKFLOW TASK
// =====================================================

async function createWorkflowTask(
  client,
  businessId,
  verificationStatus
) {
  // ---------------------------------------------
  // VERIFIED
  // ---------------------------------------------

  if (verificationStatus === "Verified") {
    await client.query(
      `
      INSERT INTO workflow_tasks (
        business_id,
        task_name,
        task_description,
        task_status,
        assigned_to,
        completed_at
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        CURRENT_TIMESTAMP
      )
      `,
      [
        businessId,
        "Verification completed",
        "Automated website verification completed successfully.",
        "Completed",
        "AI Verification Engine"
      ]
    );

    return;
  }


  // ---------------------------------------------
  // NEEDS REVIEW / FAILED
  // ---------------------------------------------

  await client.query(
    `
    INSERT INTO workflow_tasks (
      business_id,
      task_name,
      task_description,
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
      CURRENT_TIMESTAMP + INTERVAL '3 days'
    )
    `,
    [
      businessId,
      "Manual review required",
      `Automated verification returned status: ${verificationStatus}.`,
      "Pending",
      "Human Reviewer"
    ]
  );
}


// =====================================================
// SAVE VERIFICATION RESULT
// =====================================================

async function saveVerificationResult({
  businessName,
  website,
  result
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");


    // =================================================
    // 1. PREPARE VALUES
    // =================================================

    const normalizedWebsite =
      normalizeWebsite(
        result?.finalUrl ||
        website
      );


    const verificationStatus =
      mapVerificationStatus(result);


    const confidenceScore =
      Number.isFinite(
        Number(result?.confidence)
      )
        ? Number(result.confidence)
        : 0;


    // =================================================
    // 2. FIND OR CREATE BUSINESS
    // =================================================

    const existingBusiness =
      await findExistingBusiness(
        client,
        businessName,
        normalizedWebsite
      );


    let business;


    if (!existingBusiness) {

      business =
        await createBusiness(
          client,
          businessName,
          normalizedWebsite
        );

    } else {

      business =
        await updateBusiness(
          client,
          existingBusiness.business_id,
          normalizedWebsite
        );
    }


    const businessId =
      business.business_id;


    // =================================================
    // 3. DETERMINE VERIFICATION EVIDENCE
    // =================================================

    const websiteVerified =
      Boolean(
        result?.reachable &&
        (
          result?.finalUrl ||
          result?.website ||
          normalizedWebsite
        )
      );


    const phoneVerified =
      Boolean(
        result?.phoneFound
      );


    const emailVerified =
      Boolean(
        result?.emailFound ||
        (
          Array.isArray(result?.emails) &&
          result.emails.length > 0
        )
      );


    // =================================================
    // 4. DISCREPANCIES / NOTES
    // =================================================

    const discrepancies =
      verificationStatus === "Verified"
        ? null
        : buildDiscrepancyDetails(result);


    const notes = [
      `Business: ${businessName}`,
      `Website: ${normalizedWebsite || "Not available"}`,
      `Reachable: ${result?.reachable ? "Yes" : "No"}`,
      `Screenshot: ${result?.screenshotAvailable ? "Available" : "Not available"}`,
      `Pages crawled: ${result?.pagesCrawled ?? 0}`
    ].join(" | ");


    // =================================================
    // 5. INSERT INTO NEW verification_results TABLE
    // =================================================

    const verificationRecord =
      await client.query(
        `
        INSERT INTO verification_results (
          business_id,
          website_verified,
          email_verified,
          phone_verified,
          confidence_score,
          verification_status,
          discrepancies,
          notes,
          verified_at
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
          CURRENT_TIMESTAMP
        )

        RETURNING *
        `,
        [
          businessId,
          websiteVerified,
          emailVerified,
          phoneVerified,
          confidenceScore,
          verificationStatus,
          discrepancies,
          notes
        ]
      );


    // =================================================
    // 6. CREATE WORKFLOW TASK
    // =================================================

    await createWorkflowTask(
      client,
      businessId,
      verificationStatus
    );


    // =================================================
    // 7. ACTIVITY LOG
    // =================================================

    await client.query(
      `
      INSERT INTO activity_logs (
        action_type,
        description
      )

      VALUES (
        $1,
        $2
      )
      `,
      [
        "VERIFY",
        `${businessName} verification completed with status ${verificationStatus} and confidence ${confidenceScore}.`
      ]
    );


    // =================================================
    // 8. COMMIT TRANSACTION
    // =================================================

    await client.query("COMMIT");


    console.log(
      `[TRACKING] Verification saved for ${businessName}`
    );

    console.log(
      `[TRACKING] Business ID: ${businessId}`
    );

    console.log(
      `[TRACKING] Verification status: ${verificationStatus}`
    );

    console.log(
      `[TRACKING] Confidence: ${confidenceScore}`
    );


    return {
      business_id:
        businessId,

      business,

      verification_result:
        verificationRecord.rows[0]
    };


  } catch (error) {

    await client.query("ROLLBACK");


    console.error(
      "[TRACKING] Failed to save verification result:",
      {
        businessName,
        website,
        error:
          error.message
      }
    );


    throw error;


  } finally {

    client.release();
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  normalizeWebsite,
  mapVerificationStatus,
  saveVerificationResult
};
