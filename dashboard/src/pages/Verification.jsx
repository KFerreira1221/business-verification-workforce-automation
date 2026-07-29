import { useEffect, useState } from "react";
import VerificationCard from "../components/VerificationCard";
import {
  getVerificationHistory,
  getBusinesses,
  runVerification,
  approveBusinessVerification,
  rejectBusinessVerification,
} from "../api";

export default function Verification() {
  const [history, setHistory] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [runningBusinessId, setRunningBusinessId] = useState(null);
  const [actioning, setActioning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [hist, biz] = await Promise.all([
        getVerificationHistory(),
        getBusinesses(),
      ]);

      setHistory(Array.isArray(hist) ? hist : hist?.history || []);
      setBusinesses(Array.isArray(biz) ? biz : biz?.businesses || []);
    } catch (err) {
      console.error("Failed to load verification data:", err);

      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load verification data";

      setMessage(`❌ ${errorMessage}`);
    }
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

  async function handleRunVerification(business) {
    if (!business?.website) {
      setMessage("❌ Business has no website to verify");
      return;
    }

    setRunningBusinessId(business.business_id);
    setMessage("");
    setSelected(null);

    try {
      const result = await runVerification(
        business.business_name,
        business.website
      );

      console.log("Verification API response:", result);

      /*
       * The backend may return the saved verification data in one of these:
       *
       * result.verification
       * result.saved.verification_result
       * result.result
       *
       * This normalizes the response so the frontend can display it.
       */
      const verification =
        result?.verification ||
        result?.saved?.verification_result ||
        result?.saved?.verificationResult ||
        result?.result ||
        {};

      const confidenceScore = Number(
        verification.confidence_score ??
          verification.confidenceScore ??
          result?.confidence_score ??
          result?.confidenceScore ??
          0
      );

      const businessId =
        result?.saved?.business_id ||
        result?.saved?.businessId ||
        result?.business_id ||
        result?.businessId ||
        business.business_id;

      setSelected({
        businessId,
        business: business.business_name,

        website: isVerified(
          verification.website_verified ??
            verification.websiteVerified ??
            verification.reachable
        )
          ? "Verified"
          : "Not Verified",

        phone: isVerified(
          verification.phone_verified ??
            verification.phoneVerified ??
            verification.phone_found ??
            verification.phoneFound
        )
          ? "Verified"
          : "Not Verified",

        email: isVerified(
          verification.email_verified ??
            verification.emailVerified ??
            verification.email_found ??
            verification.emailFound
        )
          ? "Verified"
          : "Not Verified",

        confidence: confidenceScore,

        recommendation:
          confidenceScore >= 80
            ? "APPROVE"
            : confidenceScore >= 60
              ? "REVIEW"
              : "REJECT",
      });

      setMessage(`✅ Verification complete for ${business.business_name}`);

      await loadData();
    } catch (err) {
      console.error("Verification failed:", err);

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
      setMessage("❌ Missing business ID. Unable to approve.");
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

      setMessage(`✅ Approved: ${result.business}`);
      setSelected(null);

      await loadData();
    } catch (err) {
      console.error("Approve failed:", err);

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
      setMessage("❌ Missing business ID. Unable to reject.");
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

      setMessage(`❌ Rejected: ${result.business}`);
      setSelected(null);

      await loadData();
    } catch (err) {
      console.error("Reject failed:", err);

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
      <h1 className="page-title">Verification</h1>

      {message && <p className="upload-msg">{message}</p>}

      <div className="verification-layout">
        <div className="section">
          <h2>Run Verification</h2>
          <p>Select a business to verify:</p>

          {businesses.length === 0 ? (
            <p>No businesses are currently available.</p>
          ) : (
            <ul className="biz-selector">
              {businesses.slice(0, 10).map((business) => {
                const isRunning =
                  runningBusinessId === business.business_id;

                return (
                  <li key={business.business_id}>
                    <span>{business.business_name}</span>

                    <button
                      className="btn-sm btn-edit"
                      disabled={runningBusinessId !== null || actioning}
                      onClick={() => handleRunVerification(business)}
                    >
                      {isRunning ? "Running..." : "Verify"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="section">
          {selected ? (
            <VerificationCard
              result={selected}
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={actioning}
            />
          ) : runningBusinessId !== null ? (
            <p>Searching and verifying business information...</p>
          ) : (
            <p>Select a business and click Verify to see results.</p>
          )}
        </div>
      </div>

      <div className="section">
        <h2>Verification History</h2>

        {history.length === 0 ? (
          <p>No verification history yet.</p>
        ) : (
          <table className="biz-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {history.map((verification, index) => {
                const status =
                  verification.verification_status ||
                  verification.status ||
                  "Pending";

                const confidence = Number(
                  verification.confidence_score ??
                    verification.confidence ??
                    0
                );

                const verifiedDate =
                  verification.verified_at ||
                  verification.created_at ||
                  verification.updated_at;

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
                        "Unknown Business"}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          status === "Verified" ||
                          status === "Approved"
                            ? "badge-green"
                            : "badge-yellow"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    <td>{confidence}%</td>

                    <td>
                      {verifiedDate
                        ? new Date(verifiedDate).toLocaleDateString()
                        : "Not available"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
