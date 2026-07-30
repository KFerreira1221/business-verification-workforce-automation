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

      console.log("Businesses:", biz);
      console.log("Verification History:", hist);

      setHistory(
        Array.isArray(hist)
          ? hist
          : hist?.results ||
            hist?.history ||
            []
      );

      setBusinesses(
        Array.isArray(biz)
          ? biz
          : biz?.businesses ||
            biz?.results ||
            []
      );
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

      const crawlerResult =
        result?.result ||
        result?.verification ||
        {};

      const savedResult =
        result?.saved?.verification_result ||
        result?.saved?.verificationResult ||
        {};

      const confidenceScore = Number(
        savedResult.confidence_score ??
          savedResult.confidenceScore ??
          savedResult.confidence ??
          crawlerResult.confidence_score ??
          crawlerResult.confidenceScore ??
          crawlerResult.confidence ??
          result?.confidence_score ??
          result?.confidenceScore ??
          result?.confidence ??
          0
      );

      const businessId =
        result?.saved?.business_id ||
        result?.saved?.businessId ||
        savedResult.business_id ||
        savedResult.businessId ||
        result?.business_id ||
        result?.businessId ||
        business.business_id;

      const websiteVerified =
        savedResult.website_verified ??
        savedResult.websiteVerified ??
        crawlerResult.website_verified ??
        crawlerResult.websiteVerified ??
        crawlerResult.reachable;

      const phoneVerified =
        savedResult.phone_verified ??
        savedResult.phoneVerified ??
        crawlerResult.phone_verified ??
        crawlerResult.phoneVerified ??
        crawlerResult.phone_found ??
        crawlerResult.phoneFound;

      const emailVerified =
        savedResult.email_verified ??
        savedResult.emailVerified ??
        crawlerResult.email_verified ??
        crawlerResult.emailVerified ??
        crawlerResult.email_found ??
        crawlerResult.emailFound;

      setSelected({
        businessId,
        business: business.business_name,

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

        recommendation:
          confidenceScore >= 80
            ? "APPROVE"
            : confidenceScore >= 60
              ? "REVIEW"
              : "REJECT",
      });

      setMessage(
        `✅ Verification complete for ${business.business_name}`
      );

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
                      disabled={
                        runningBusinessId !== null ||
                        actioning ||
                        !business.website
                      }
                      onClick={() =>
                        handleRunVerification(business)
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
            <VerificationCard
              result={selected}
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={actioning}
            />
          ) : runningBusinessId !== null ? (
            <p>
              Searching and verifying business information...
            </p>
          ) : (
            <p>
              Select a business and click Verify to see results.
            </p>
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
                  verification.decision ||
                  "Pending";

                const confidence = Number(
                  verification.confidence_score ??
                    verification.confidenceScore ??
                    verification.confidence ??
                    0
                );

                const verifiedDate =
                  verification.verified_at ||
                  verification.created_at ||
                  verification.updated_at;

                const approved =
                  status === "Verified" ||
                  status === "Approved" ||
                  status === "APPROVE";

                const rejected =
                  status === "Rejected" ||
                  status === "REJECT";

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

                    <td>{confidence}%</td>

                    <td>
                      {verifiedDate
                        ? new Date(
                            verifiedDate
                          ).toLocaleDateString()
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
