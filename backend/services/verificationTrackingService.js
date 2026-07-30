// =====================================================
// IN-MEMORY VERIFICATION TRACKING SERVICE
//
// PostgreSQL has been removed from this service.
//
// Results are stored temporarily in server memory.
// They remain available while the backend is running,
// but they reset whenever Render restarts or redeploys.
// =====================================================


// =====================================================
// TEMPORARY IN-MEMORY STORAGE
// =====================================================

const verificationHistory = [];

let nextVerificationId = 1;
let nextBusinessId = 1;


// =====================================================
// NORMALIZE WEBSITE
// =====================================================

function normalizeWebsite(website) {
  if (!website) {
    return null;
  }

  const cleanedWebsite = String(
    website
  ).trim();

  if (!cleanedWebsite) {
    return null;
  }

  return /^https?:\/\//i.test(cleanedWebsite)
    ? cleanedWebsite
    : `https://${cleanedWebsite}`;
}


// =====================================================
// MAP VERIFICATION STATUS
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
  return {
    reachable:
      result?.reachable ?? null,

    httpStatus:
      result?.httpStatus ?? null,

    errorType:
      result?.errorType ?? null,

    errorMessage:
      result?.errorMessage ?? null,

    finalUrl:
      result?.finalUrl ?? null,

    soft404:
      result?.soft404 ?? false,

    businessNameFound:
      result?.businessNameFound ?? false,

    phoneFound:
      result?.phoneFound ?? false,

    emailFound:
      result?.emailFound ?? false,

    addressFound:
      result?.addressFound ?? false,

    screenshotAvailable:
      result?.screenshotAvailable ?? false,

    pagesCrawled:
      result?.pagesCrawled ?? 0,

    attempts:
      Array.isArray(result?.attempts)
        ? result.attempts
        : [],
  };
}


// =====================================================
// CREATE BUSINESS OBJECT
// =====================================================

function createBusinessObject(
  businessName,
  website,
  result
) {
  return {
    business_id:
      nextBusinessId++,

    business_name:
      businessName,

    website:
      normalizeWebsite(
        result?.finalUrl ||
        website
      ),

    business_status:
      "Pending",

    created_at:
      new Date().toISOString(),

    updated_at:
      new Date().toISOString(),
  };
}


// =====================================================
// SAVE VERIFICATION RESULT IN MEMORY
// =====================================================

async function saveVerificationResult({
  businessName,
  website,
  result,
}) {
  if (!businessName) {
    throw new Error(
      "businessName is required"
    );
  }

  if (!website) {
    throw new Error(
      "website is required"
    );
  }

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

  const websiteVerified =
    Boolean(
      result?.reachable &&
      normalizedWebsite
    );

  const phoneVerified =
    Boolean(
      result?.phoneFound ||
      (
        Array.isArray(result?.phones) &&
        result.phones.length > 0
      )
    );

  const emailVerified =
    Boolean(
      result?.emailFound ||
      (
        Array.isArray(result?.emails) &&
        result.emails.length > 0
      )
    );

  const business =
    createBusinessObject(
      businessName,
      normalizedWebsite,
      result
    );

  const verificationRecord = {
    verification_id:
      nextVerificationId++,

    business_id:
      business.business_id,

    business_name:
      businessName,

    website:
      normalizedWebsite,

    website_verified:
      websiteVerified,

    email_verified:
      emailVerified,

    phone_verified:
      phoneVerified,

    confidence_score:
      confidenceScore,

    verification_status:
      verificationStatus,

    discrepancies:
      verificationStatus === "Verified"
        ? null
        : buildDiscrepancyDetails(
            result
          ),

    notes: [
      `Business: ${businessName}`,
      `Website: ${
        normalizedWebsite ||
        "Not available"
      }`,
      `Reachable: ${
        result?.reachable
          ? "Yes"
          : "No"
      }`,
      `Screenshot: ${
        result?.screenshotAvailable
          ? "Available"
          : "Not available"
      }`,
      `Pages crawled: ${
        result?.pagesCrawled ?? 0
      }`,
    ].join(" | "),

    verified_at:
      new Date().toISOString(),

    result,
  };

  verificationHistory.unshift(
    verificationRecord
  );

  // Prevent unlimited memory growth.
  if (
    verificationHistory.length >
    500
  ) {
    verificationHistory.length =
      500;
  }

  console.log(
    `[TRACKING] Verification stored in memory for ${businessName}`
  );

  console.log(
    `[TRACKING] Verification status: ${verificationStatus}`
  );

  console.log(
    `[TRACKING] Confidence: ${confidenceScore}`
  );

  return {
    business_id:
      business.business_id,

    business,

    verification_result:
      verificationRecord,

    storage:
      "memory",

    persistent:
      false,
  };
}


// =====================================================
// GET VERIFICATION HISTORY
// =====================================================

function getVerificationHistory(
  limit = 100
) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) || 100,
        500
      )
    );

  return verificationHistory.slice(
    0,
    safeLimit
  );
}


// =====================================================
// FIND VERIFICATION BY ID
// =====================================================

function getVerificationById(
  verificationId
) {
  const id =
    Number(verificationId);

  if (!Number.isFinite(id)) {
    return null;
  }

  return (
    verificationHistory.find(
      (record) =>
        record.verification_id ===
        id
    ) || null
  );
}


// =====================================================
// CHECK WHETHER A BUSINESS WAS VERIFIED
// =====================================================

function hasBusinessBeenVerified({
  businessName,
  website,
}) {
  const normalizedName =
    String(
      businessName || ""
    )
      .trim()
      .toLowerCase();

  const normalizedWebsite =
    normalizeWebsite(website);

  return verificationHistory.some(
    (record) => {
      const recordName =
        String(
          record.business_name || ""
        )
          .trim()
          .toLowerCase();

      return (
        recordName ===
          normalizedName ||
        (
          normalizedWebsite &&
          record.website ===
            normalizedWebsite
        )
      );
    }
  );
}


// =====================================================
// CLEAR HISTORY
// =====================================================

function clearVerificationHistory() {
  const removed =
    verificationHistory.length;

  verificationHistory.length = 0;

  nextVerificationId = 1;
  nextBusinessId = 1;

  console.log(
    `[TRACKING] Cleared ${removed} in-memory verification records`
  );

  return {
    success: true,
    removed,
  };
}


// =====================================================
// STORAGE STATUS
// =====================================================

function getStorageStatus() {
  return {
    type:
      "memory",

    persistent:
      false,

    count:
      verificationHistory.length,

    warning:
      "Verification history resets whenever the backend restarts or redeploys.",
  };
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  normalizeWebsite,
  mapVerificationStatus,
  saveVerificationResult,
  getVerificationHistory,
  getVerificationById,
  hasBusinessBeenVerified,
  clearVerificationHistory,
  getStorageStatus,
};
