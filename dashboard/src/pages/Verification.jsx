import { useEffect, useState } from "react";
import VerificationCard from "../components/VerificationCard";
import { getVerificationHistory, getBusinesses, runVerification } from "../api";

export default function Verification() {
  const [history,    setHistory]    = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [running,    setRunning]    = useState(false);
  const [message,    setMessage]    = useState("");

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
      const result = await runVerification(business.business_name, business.website);
      setMessage(`✅ Verification complete for ${business.business_name}`);
      setSelected({
        business:       business.business_name,
        website:        result.result?.website_verified ? "Verified" : "Not Verified",
        phone:          result.result?.phone_verified   ? "Verified" : "Not Verified",
        email:          result.result?.email_verified   ? "Verified" : "Not Verified",
        confidence:     result.result?.confidence_score || 0,
        recommendation: result.result?.confidence_score >= 80 ? "APPROVE" : "REVIEW",
      });
      loadData();
    } catch (err) {
      setMessage("❌ Verification failed");
    } finally {
      setRunning(false);
    }
  }

  function handleApprove(result) {
    setMessage(`✅ Approved: ${result.business}`);
    setSelected(null);
  }

  function handleReject(result) {
    setMessage(`❌ Rejected: ${result.business}`);
    setSelected(null);
  }

  return (
    <div className="page">
      <h1 className="page-title">Verification</h1>

      {message && <p className="upload-msg">{message}</p>}

      <div className="verification-layout">
        {/* Run verification */}
        <div className="section">
          <h2>Run Verification</h2>
          <p>Select a business to verify:</p>
          <ul className="biz-selector">
            {businesses.slice(0, 10).map((b) => (
              <li key={b.business_id}>
                <span>{b.business_name}</span>
                <button
                  className="btn-sm btn-edit"
                  disabled={running}
                  onClick={() => handleRunVerification(b)}
                >
                  {running ? "Running..." : "Verify"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Result card */}
        <div className="section">
          {selected ? (
            <VerificationCard
              result={selected}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ) : (
            <p>Select a business and click Verify to see results.</p>
          )}
        </div>
      </div>

      {/* History */}
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
                    <span className={`badge ${v.verification_status === "Verified" ? "badge-green" : "badge-yellow"}`}>
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