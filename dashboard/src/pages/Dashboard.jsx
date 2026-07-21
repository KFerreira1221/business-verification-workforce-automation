import { useEffect, useState } from "react";
import StatusCard from "../components/StatusCard";
import { getBusinesses, getVerificationHistory } from "../api";

export default function Dashboard() {
  const [businesses,    setBusinesses]    = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [bizData, verData] = await Promise.all([
          getBusinesses(),
          getVerificationHistory(),
        ]);
        setBusinesses(bizData);
        setVerifications(verData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const verified = businesses.filter((b) => b.business_status === "Verified").length;
  const pending  = businesses.filter((b) => b.business_status === "Pending").length;

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>;

  return (
    <div className="page">
      <h1 className="page-title">AI Business Verification Dashboard</h1>

      {/* Status Cards */}
      <div className="cards-row">
        <StatusCard title="Businesses" value={businesses.length} color="#4f8ef7" />
        <StatusCard title="Pending"    value={pending}           color="#f7a94f" />
        <StatusCard title="Verified"   value={verified}          color="#4fcf70" />
        <StatusCard title="Checks"     value={verifications.length} color="#a94ff7" />
      </div>

      {/* Recent Businesses */}
      <div className="section">
        <h2>Recent Businesses</h2>
        <table className="biz-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Industry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {businesses.slice(0, 5).map((b) => (
              <tr key={b.business_id}>
                <td>{b.business_name}</td>
                <td>{b.industry || "—"}</td>
                <td>
                  <span className={`badge ${b.business_status === "Verified" ? "badge-green" : "badge-yellow"}`}>
                    {b.business_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Verifications */}
      <div className="section">
        <h2>Recent Verification Activity</h2>
        {verifications.length === 0 ? (
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
              {verifications.slice(0, 5).map((v, i) => (
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