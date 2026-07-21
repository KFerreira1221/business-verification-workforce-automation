const API_BASE = "http://localhost:5000/api";

// ── Businesses ──────────────────────────────────────
export const getBusinesses = async () => {
  const res = await fetch(`${API_BASE}/businesses`);
  const data = await res.json();
  return data.businesses || [];
};

export const createBusiness = async (business) => {
  const res = await fetch(`${API_BASE}/businesses`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(business),
  });
  return res.json();
};

export const updateBusiness = async (id, business) => {
  const res = await fetch(`${API_BASE}/businesses/${id}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(business),
  });
  return res.json();
};

export const deleteBusiness = async (id) => {
  const res = await fetch(`${API_BASE}/businesses/${id}`, {
    method: "DELETE",
  });
  return res.json();
};

// ── Verification ─────────────────────────────────────
export const getVerificationHistory = async () => {
  const res = await fetch(`${API_BASE}/verification/history`);
  return res.json();
};

export const runVerification = async (businessName, website) => {
  const res = await fetch(`${API_BASE}/verification/run`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ businessName, website }),
  });
  return res.json();
};

// ── Dashboard ─────────────────────────────────────────
export const getDashboardStats = async () => {
  const res = await fetch(`${API_BASE}/dashboard`);
  return res.json();
};

// ── System Status ─────────────────────────────────────
export const getSystemStatus = async () => {
  const res = await fetch(`${API_BASE}/system/status`);
  return res.json();
};