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
  const [running, setRunning] = useState(false);
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
      setHistory(hist);
      setBusinesses(biz);
    } catch (err) {
      console.error("Failed to load verification data:", err);
      setMessage("❌ Failed to load verification data");
    }
  }

  async function handleRunVerification(business) {
    if (!business.website) {
      setMessage("❌ Business has no website to verify");
      return;
    }

    setRunning(true);
    setMessage("");

    try {
      const result = await runVerification(
        business.business_name,
        business.website
      );

      setMessage(`✅ Verification complete for ${business.business_name}`);

      setSelected({
        businessId: business.business_id,
        business: business.business_name,
        website: result.result?.website_verified ? "Verified" : "Not Verified",
        phone: result.result?.phone_verified ? "Verified" : "Not Verified",
        email: result.result?.email_verified ? "Verified" : "Not Verified",
        confidence: result.result?.confidence_score || 0,
        recommendation:
          result.result?.confidence_score >= 80 ? "APPROVE" : "REVIEW",
      });

      await loadData();
    } catch (err) {
      console.error("Verification failed:", err);
      setMessage("❌ Verification failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove(result) {
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
      setMessage("❌ Failed to approve business");
    } finally {
      setActioning(false);
    }
  }

  async function handleReject(result) {
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
      setMessage("❌ Failed to reject business");
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
          <ul className="biz-selector">
            {businesses.slice(0, 10).map((b) => (
              <li key={b.business_id}>
                <span>{b.business_name}</span>
                <button
                  className="btn-sm btn-edit"
                  disabled={running || actioning}
                  onClick={() => handleRunVerification(b)}
                >
                  {running ? "Running..." : "Verify"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="section">
          {selected ? (
            <VerificationCard
              result={selected}
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={actioning}
            />
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
              {history.map((v, i) => (
                <tr key={i}>
                  <td>{v.business_name}</td>
                  <td>
                    <span
                      className={`badge ${
                        v.verification_status === "Verified"
                          ? "badge-green"
                          : "badge-yellow"
                      }`}
                    >
                      {v.verification_status}
                    </span>
                  </td>
                  <td>{v.confidence_score}%</td>
                  <td>{new Date(v.verified_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}