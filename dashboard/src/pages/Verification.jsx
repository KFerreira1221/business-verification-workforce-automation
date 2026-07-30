import { useEffect, useState } from "react";
import VerificationCard from "../components/VerificationCard";
import {
  getVerificationHistory,
  getBusinesses,
  runVerification,
  approveBusinessVerification,
  rejectBusinessVerification,
} from "../api";

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
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
  if (Array.isArray(value)) return value;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  return [value];
}

function isVerified(value) {
  return (
    value === true ||
    value === "true" ||
    value === "Verified" ||
    value === "verified" ||
    value === 1
  );
}

function extractVerification(result, business) {
  const crawlerResult =
    result?.result ??
    result?.verification ??
    result?.crawlerResult ??
    result?.crawler_result ??
    result ??
    {};

  const savedResult =
    result?.saved?.verification_result ??
    result?.saved?.verificationResult ??
    result?.saved ??
    {};

  const confidenceScore = Number(
    savedResult?.confidence_score ??
      savedResult?.confidenceScore ??
      savedResult?.confidence ??
      crawlerResult?.confidence_score ??
      crawlerResult?.confidenceScore ??
      crawlerResult?.confidence ??
      result?.confidence_score ??
      result?.confidenceScore ??
      result?.confidence ??
      0
  );

  const pagesCrawled = Number(
    crawlerResult?.pages_crawled ??
      crawlerResult?.pagesCrawled ??
      crawlerResult?.page_count ??
      crawlerResult?.pageCount ??
      crawlerResult?.pages?.length ??
      0
  );

  const phones = toArray(
    crawlerResult?.phones ??
      crawlerResult?.phone_candidates ??
      crawlerResult?.phoneCandidates ??
      crawlerResult?.phone ??
      savedResult?.phones ??
      savedResult?.phone
  );

  const emails = toArray(
    crawlerResult?.emails ??
      crawlerResult?.email_candidates ??
      crawlerResult?.emailCandidates ??
      crawlerResult?.email ??
      savedResult?.emails ??
      savedResult?.email
  );

  const addresses = toArray(
    crawlerResult?.addresses ??
      crawlerResult?.address_candidates ??
      crawlerResult?.addressCandidates ??
      crawlerResult?.address ??
      savedResult?.addresses ??
      savedResult?.address
  );

  const websiteVerified =
    savedResult?.website_verified ??
    savedResult?.websiteVerified ??
    crawlerResult?.website_verified ??
    crawlerResult?.websiteVerified ??
    crawlerResult?.reachable ??
    pagesCrawled > 0;

  const phoneVerified =
    savedResult?.phone_verified ??
    savedResult?.phoneVerified ??
    crawlerResult?.phone_verified ??
    crawlerResult?.phoneVerified ??
    crawlerResult?.phone_found ??
    crawlerResult?.phoneFound ??
    phones.length > 0;

  const emailVerified =
    savedResult?.email_verified ??
    savedResult?.emailVerified ??
    crawlerResult?.email_verified ??
    crawlerResult?.emailVerified ??
    crawlerResult?.email_found ??
    crawlerResult?.emailFound ??
    emails.length > 0;

  const businessId =
    result?.saved?.business_id ??
    result?.saved?.businessId ??
    savedResult?.business_id ??
    savedResult?.businessId ??
    result?.business_id ??
    result?.businessId ??
    business?.business_id;

  const status =
    pagesCrawled === 0
      ? "Needs Review"
      : confidenceScore >= 80
        ? "Verified"
        : confidenceScore >= 60
          ? "Review Recommended"
          : "Needs Review";

  return {
    businessId,
    business: business?.business_name ?? "Unknown Business",
    websiteUrl: business?.website ?? "",

    website: isVerified(websiteVerified)
      ? "Verified"
      : "Not Verified",

    phone: isVerified(phoneVerified)
      ? "Verified"
      : "Not Verified",

    email: isVerified(emailVerified)
      ? "Verified"
      : "Not Verified",

    confidence: confidenceScore,
    pagesCrawled,
    phones,
    emails,
    addresses,
    status,

    recommendation:
      confidenceScore >= 80
        ? "APPROVE"
        : confidenceScore >= 60
          ? "REVIEW"
          : "REJECT",

    verifiedAt: new Date().toISOString(),
  };
}

export default function Verification() {
  const [history, setHistory] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [runningBusinessId, setRunningBusinessId] =
    useState(null);
  const [actioning, setActioning] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [historyResult, businessesResult] =
      await Promise.allSettled([
        getVerificationHistory(),
        getBusinesses(),
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
    }

    if (businessesResult.status === "fulfilled") {
      const normalizedBusinesses =
        normalizeBusinesses(
          businessesResult.value
        ).map(normalizeBusiness);

      setBusinesses(normalizedBusinesses);

      if (normalizedBusinesses.length === 0) {
        setMessage(
          "⚠️ The business request succeeded, but returned no businesses."
        );
      } else {
        setMessage("");
      }
    } else {
      console.error(
        "Failed to load businesses:",
        businessesResult.reason
      );

      const errorMessage =
        businessesResult.reason?.response?.data
          ?.error ||
        businessesResult.reason?.response?.data
          ?.message ||
        businessesResult.reason?.message ||
        "Failed to load businesses";

      setMessage(`❌ ${errorMessage}`);
    }

    setLoading(false);
  }

  async function handleRunVerification(business) {
    if (!business?.website) {
      setMessage(
        "❌ Business has no website to verify."
      );
      return;
    }

    setRunningBusinessId(business.business_id);
    setMessage("");
    setSelected(null);

    try {
      const response = await runVerification(
        business.business_name,
        business.website
      );

      console.log(
        "Verification API response:",
        response
      );

      const verificationResult =
        extractVerification(response, business);

      setSelected(verificationResult);

      setHistory((currentHistory) => [
        {
          verification_id: `local-${Date.now()}`,
          business_id:
            verificationResult.businessId,
          business_name:
            verificationResult.business,
          website:
            verificationResult.websiteUrl,
          verification_status:
            verificationResult.status,
          confidence_score:
            verificationResult.confidence,
          pages_crawled:
            verificationResult.pagesCrawled,
          phones:
            verificationResult.phones,
          emails:
            verificationResult.emails,
          addresses:
            verificationResult.addresses,
          verified_at:
            verificationResult.verifiedAt,
        },
        ...currentHistory,
      ]);

      if (
        verificationResult.pagesCrawled === 0
      ) {
        setMessage(
          `⚠️ Verification completed, but no pages were crawled for ${business.business_name}.`
        );
      } else {
        setMessage(
          `✅ Verification complete for ${business.business_name}`
        );
      }
    } catch (err) {
      console.error(
        "Verification failed:",
        err
      );

      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Verification failed";

      setMessage(`❌ ${errorMessage}`);
    } finally {
      setRunningBusinessId(null);
    }
  }

  async function handleApprove(result) {
    if (!result?.businessId) {
      setMessage(
        "❌ Missing business ID. Unable to approve."
      );
      return;
    }

    setActioning(true);
    setMessage("");

    try {
      await approveBusinessVerification(
        result.businessId,
        result.confidence,
        "Approved after verification"
      );

      setMessage(
        `✅ Approved: ${result.business}`
      );

      setSelected(null);

      await loadData();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to approve business";

      setMessage(`❌ ${errorMessage}`);
    } finally {
      setActioning(false);
    }
  }

  async function handleReject(result) {
    if (!result?.businessId) {
      setMessage(
        "❌ Missing business ID. Unable to reject."
      );
      return;
    }

    setActioning(true);
    setMessage("");

    try {
      await rejectBusinessVerification(
        result.businessId,
        result.confidence,
        "Rejected after verification"
      );

      setMessage(
        `❌ Rejected: ${result.business}`
      );

      setSelected(null);

      await loadData();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reject business";

      setMessage(`❌ ${errorMessage}`);
    } finally {
      setActioning(false);
    }
  }

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
        <div className="section">
          <h2>Run Verification</h2>

          <p>
            Select a business to verify:
          </p>

          {loading ? (
            <p>Loading businesses...</p>
          ) : businesses.length === 0 ? (
            <div>
              <p>
                No businesses are currently
                available.
              </p>

              <button
                className="btn-sm btn-edit"
                onClick={loadData}
              >
                Try Again
              </button>
            </div>
          ) : (
            <ul className="biz-selector">
              {businesses.map((business) => {
                const isRunning =
                  runningBusinessId ===
                  business.business_id;

                return (
                  <li
                    key={
                      business.business_id
                    }
                  >
                    <span>
                      {business.business_name}
                    </span>

                    <button
                      className="btn-sm btn-edit"
                      disabled={
                        runningBusinessId !==
                          null ||
                        actioning ||
                        !business.website
                      }
                      onClick={() =>
                        handleRunVerification(
                          business
                        )
                      }
                    >
                      {isRunning
                        ? "Running..."
                        : business.website
                          ? "Verify"
                          : "No Website"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="section">
          {selected ? (
            <div>
              <VerificationCard
                result={selected}
                onApprove={handleApprove}
                onReject={handleReject}
                disabled={actioning}
              />

              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <h3>
                  Verification Output
                </h3>

                <p>
                  <strong>Website:</strong>{" "}
                  {selected.websiteUrl ||
                    "Not available"}
                </p>

                <p>
                  <strong>
                    Pages crawled:
                  </strong>{" "}
                  {selected.pagesCrawled}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {selected.status}
                </p>

                <p>
                  <strong>
                    Confidence:
                  </strong>{" "}
                  {selected.confidence}%
                </p>

                <p>
                  <strong>Phones:</strong>{" "}
                  {selected.phones.length
                    ? selected.phones.join(
                        ", "
                      )
                    : "None found"}
                </p>

                <p>
                  <strong>Emails:</strong>{" "}
                  {selected.emails.length
                    ? selected.emails.join(
                        ", "
                      )
                    : "None found"}
                </p>

                <p>
                  <strong>
                    Addresses:
                  </strong>{" "}
                  {selected.addresses.length
                    ? selected.addresses.join(
                        ", "
                      )
                    : "None found"}
                </p>
              </div>
            </div>
          ) : runningBusinessId !== null ? (
            <p>
              Searching and verifying business
              information...
            </p>
          ) : (
            <p>
              Select a business and click Verify
              to see results.
            </p>
          )}
        </div>
      </div>

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
                  (
                    verification,
                    index
                  ) => {
                    const status =
                      verification.verification_status ||
                      verification.status ||
                      verification.decision ||
                      "Pending";

                    const confidence =
                      Number(
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

                    const addresses =
                      toArray(
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
                            ? addresses.join(
                                ", "
                              )
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
