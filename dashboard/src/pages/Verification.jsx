import { useEffect, useState } from "react";
import {
  getVerificationHistory,
  getDatasetBusinesses,
} from "../api";

// =======================================================
// HELPERS
// =======================================================

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeBusiness(raw, index = 0) {
  return {
    ...raw,

    business_id:
      raw?.business_id ??
      raw?.businessId ??
      raw?.id ??
      index + 1,

    business_name:
      raw?.business_name ??
      raw?.businessName ??
      raw?.company_name ??
      raw?.companyName ??
      raw?.name ??
      `Business ${index + 1}`,

    website:
      raw?.website ??
      raw?.website_url ??
      raw?.websiteUrl ??
      raw?.url ??
      "",

    phone_number:
      raw?.phone_number ??
      raw?.phoneNumber ??
      raw?.phone ??
      "",

    email:
      raw?.email ??
      raw?.email_address ??
      raw?.emailAddress ??
      "",

    industry:
      raw?.industry ??
      raw?.business_industry ??
      raw?.category ??
      "",

    status:
      raw?.status ??
      raw?.business_status ??
      raw?.businessStatus ??
      "",

    address:
      raw?.address ??
      raw?.business_address ??
      raw?.street_address ??
      "",

    city:
      raw?.city ?? "",

    state:
      raw?.state ?? "",

    zip_code:
      raw?.zip_code ??
      raw?.zipCode ??
      raw?.postal_code ??
      "",
  };
}

function normalizeBusinesses(payload) {
  return firstArray(
    payload,
    payload?.businesses,
    payload?.results,
    payload?.data,
    payload?.items
  );
}

function normalizeHistory(payload) {
  return firstArray(
    payload,
    payload?.history,
    payload?.results,
    payload?.verification_results,
    payload?.verificationResults,
    payload?.data
  );
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  return [value];
}

function displayValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not available";
  }

  return value;
}

// =======================================================
// VERIFICATION PAGE
// =======================================================

export default function Verification() {
  const [history, setHistory] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [importingBusinessId, setImportingBusinessId] =
    useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // =====================================================
  // LOAD DATASET BUSINESSES AND HISTORY
  // =====================================================

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [historyResult, businessesResult] =
      await Promise.allSettled([
        getVerificationHistory(),
        getDatasetBusinesses(),
      ]);

    if (historyResult.status === "fulfilled") {
      setHistory(
        normalizeHistory(historyResult.value)
      );
    } else {
      console.warn(
        "Verification history failed:",
        historyResult.reason
      );

      setHistory([]);
    }

    if (businessesResult.status === "fulfilled") {
      const normalizedBusinesses =
        normalizeBusinesses(
          businessesResult.value
        ).map(normalizeBusiness);

      setBusinesses(normalizedBusinesses);

      if (normalizedBusinesses.length === 0) {
        setMessage(
          "⚠️ The Business Dataset loaded, but it did not return any businesses."
        );
      }
    } else {
      console.error(
        "Failed to load Business Dataset:",
        businessesResult.reason
      );

      const errorMessage =
        businessesResult.reason?.response?.data
          ?.error ||
        businessesResult.reason?.response?.data
          ?.message ||
        businessesResult.reason?.message ||
        "Failed to load the Business Dataset";

      setBusinesses([]);
      setMessage(`❌ ${errorMessage}`);
    }

    setLoading(false);
  }

  // =====================================================
  // IMPORT SELECTED BUSINESS
  // =====================================================

  function handleImportVerification(business) {
    setImportingBusinessId(business.business_id);
    setMessage("");

    try {
      const importedBusiness =
        normalizeBusiness(business);

      setSelected(importedBusiness);

      setMessage(
        `✅ Imported verification information for ${importedBusiness.business_name}`
      );
    } catch (error) {
      console.error(
        "Business import failed:",
        error
      );

      setMessage(
        `❌ ${
          error?.message ||
          "Failed to import business information"
        }`
      );
    } finally {
      setImportingBusinessId(null);
    }
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="page">
      <h1 className="page-title">
        Verification
      </h1>

      {message && (
        <p className="upload-msg">
          {message}
        </p>
      )}

      <div className="verification-layout">
        {/* ===============================================
            BUSINESS DATASET LIST
        ================================================ */}

        <div className="section">
          <h2>Import Verification</h2>

          <p>
            Select a business from the Business
            Dataset to import its information:
          </p>

          {loading ? (
            <p>Loading Business Dataset...</p>
          ) : businesses.length === 0 ? (
            <div>
              <p>
                No businesses are currently
                available.
              </p>

              <button
                type="button"
                className="btn-sm btn-edit"
                onClick={loadData}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <p>
                <strong>
                  {businesses.length}
                </strong>{" "}
                businesses available
              </p>

              <ul className="biz-selector">
                {businesses.map((business) => {
                  const isImporting =
                    importingBusinessId ===
                    business.business_id;

                  const isSelected =
                    selected?.business_id ===
                    business.business_id;

                  return (
                    <li
                      key={business.business_id}
                    >
                      <span>
                        {business.business_name}
                      </span>

                      <button
                        type="button"
                        className="btn-sm btn-edit"
                        disabled={
                          importingBusinessId !==
                          null
                        }
                        onClick={() =>
                          handleImportVerification(
                            business
                          )
                        }
                      >
                        {isImporting
                          ? "Importing..."
                          : isSelected
                            ? "Imported"
                            : "Import"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* ===============================================
            IMPORTED BUSINESS OUTPUT
        ================================================ */}

        <div className="section">
          <h2>Imported Information</h2>

          {selected ? (
            <div>
              <h3>
                {selected.business_name}
              </h3>

              <p>
                <strong>
                  Business ID:
                </strong>{" "}
                {displayValue(
                  selected.business_id
                )}
              </p>

              <p>
                <strong>Website:</strong>{" "}
                {selected.website ? (
                  <a
                    href={
                      selected.website.startsWith(
                        "http"
                      )
                        ? selected.website
                        : `https://${selected.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.website}
                  </a>
                ) : (
                  "Not available"
                )}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {displayValue(
                  selected.phone_number
                )}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {displayValue(selected.email)}
              </p>

              <p>
                <strong>Industry:</strong>{" "}
                {displayValue(
                  selected.industry
                )}
              </p>

              <p>
                <strong>
                  Dataset Status:
                </strong>{" "}
                {displayValue(selected.status)}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {displayValue(
                  selected.address
                )}
              </p>

              <p>
                <strong>City:</strong>{" "}
                {displayValue(selected.city)}
              </p>

              <p>
                <strong>State:</strong>{" "}
                {displayValue(selected.state)}
              </p>

              <p>
                <strong>ZIP Code:</strong>{" "}
                {displayValue(
                  selected.zip_code
                )}
              </p>

              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <span className="badge badge-yellow">
                  Imported from Business Dataset
                </span>
              </div>
            </div>
          ) : (
            <p>
              Select a business and click Import
              to display its information here.
            </p>
          )}
        </div>
      </div>

      {/* ===============================================
          EXISTING VERIFICATION HISTORY
      ================================================ */}

      <div className="section">
        <h2>Verification History</h2>

        {history.length === 0 ? (
          <p>
            No verification history yet.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table className="biz-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Website</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {history.map(
                  (verification, index) => {
                    const status =
                      verification.verification_status ||
                      verification.status ||
                      verification.decision ||
                      "Pending";

                    const confidence = Number(
                      verification.confidence_score ??
                        verification.confidenceScore ??
                        verification.confidence ??
                        0
                    );

                    const pages = Number(
                      verification.pages_crawled ??
                        verification.pagesCrawled ??
                        verification.page_count ??
                        verification.pageCount ??
                        0
                    );

                    const phones = toArray(
                      verification.phones ??
                        verification.phone_candidates ??
                        verification.phone
                    );

                    const emails = toArray(
                      verification.emails ??
                        verification.email_candidates ??
                        verification.email
                    );

                    const addresses = toArray(
                      verification.addresses ??
                        verification.address_candidates ??
                        verification.address
                    );

                    const verifiedDate =
                      verification.verified_at ||
                      verification.created_at ||
                      verification.updated_at;

                    const approved = [
                      "Verified",
                      "Approved",
                      "APPROVE",
                    ].includes(status);

                    const rejected = [
                      "Rejected",
                      "REJECT",
                    ].includes(status);

                    return (
                      <tr
                        key={
                          verification.verification_id ||
                          verification.id ||
                          index
                        }
                      >
                        <td>
                          {verification.business_name ||
                            verification.business ||
                            verification.company_name ||
                            "Unknown Business"}
                        </td>

                        <td>
                          {verification.website ||
                            verification.website_url ||
                            "Not available"}
                        </td>

                        <td>{pages}</td>

                        <td>
                          <span
                            className={`badge ${
                              approved
                                ? "badge-green"
                                : rejected
                                  ? "badge-red"
                                  : "badge-yellow"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          {confidence}%
                        </td>

                        <td>
                          {phones.length
                            ? phones.join(", ")
                            : "None"}
                        </td>

                        <td>
                          {emails.length
                            ? emails.join(", ")
                            : "None"}
                        </td>

                        <td>
                          {addresses.length
                            ? addresses.join(", ")
                            : "None"}
                        </td>

                        <td>
                          {verifiedDate
                            ? new Date(
                                verifiedDate
                              ).toLocaleDateString()
                            : "Not available"}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
