const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://business-verification-backend.onrender.com/api";

// =======================================================
// HELPER
// =======================================================

async function handleResponse(res, label) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `${label} failed with status ${res.status}`
    );
  }

  return data;
}

// =======================================================
// BUSINESSES
// =======================================================

// Businesses already stored in PostgreSQL.
// Keep this for the Businesses tab.
export const getBusinesses = async () => {
  const res = await fetch(`${API_BASE}/businesses`);

  const data = await handleResponse(
    res,
    "Get businesses"
  );

  return data.businesses || [];
};

// Businesses imported from BusinessDatasets.csv.
// Use this for the Verification tab.
export const getDatasetBusinesses = async () => {
  const res = await fetch(
    `${API_BASE}/load/businesses`
  );

  const data = await handleResponse(
    res,
    "Get dataset businesses"
  );

  return data.businesses || [];
};

export const createBusiness = async (business) => {
  const res = await fetch(
    `${API_BASE}/businesses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(business),
    }
  );

  return handleResponse(
    res,
    "Create business"
  );
};

export const updateBusiness = async (
  id,
  business
) => {
  const res = await fetch(
    `${API_BASE}/businesses/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(business),
    }
  );

  return handleResponse(
    res,
    "Update business"
  );
};

export const deleteBusiness = async (id) => {
  const res = await fetch(
    `${API_BASE}/businesses/${id}`,
    {
      method: "DELETE",
    }
  );

  return handleResponse(
    res,
    "Delete business"
  );
};

// =======================================================
// VERIFICATION
// =======================================================

export const getVerificationHistory = async () => {
  const res = await fetch(
    `${API_BASE}/verification/history`
  );

  const data = await handleResponse(
    res,
    "Verification history"
  );

  return data.results || [];
};

export const runVerification = async (
  businessName,
  website
) => {
  const res = await fetch(
    `${API_BASE}/verification/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessName,
        website,
      }),
    }
  );

  return handleResponse(
    res,
    "Run verification"
  );
};

export const approveBusinessVerification = async (
  businessId,
  confidenceScore = null,
  notes = null
) => {
  const res = await fetch(
    `${API_BASE}/verification/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId,
        confidenceScore,
        notes,
      }),
    }
  );

  return handleResponse(
    res,
    "Approve verification"
  );
};

export const rejectBusinessVerification = async (
  businessId,
  confidenceScore = null,
  notes = null
) => {
  const res = await fetch(
    `${API_BASE}/verification/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId,
        confidenceScore,
        notes,
      }),
    }
  );

  return handleResponse(
    res,
    "Reject verification"
  );
};

// =======================================================
// DASHBOARD
// =======================================================

export const getDashboardStats = async () => {
  const res = await fetch(
    `${API_BASE}/dashboard/stats`
  );

  const data = await handleResponse(
    res,
    "Dashboard stats"
  );

  return data.stats || {};
};

// =======================================================
// SYSTEM STATUS
// =======================================================

export const getSystemStatus = async () => {
  const res = await fetch(
    `${API_BASE}/system/status`
  );

  return handleResponse(
    res,
    "System status"
  );
};
