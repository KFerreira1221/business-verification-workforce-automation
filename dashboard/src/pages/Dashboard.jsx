import { useEffect, useState } from "react";
import StatusCard from "../components/StatusCard";
import {
  getDashboardStats,
  getBusinesses,
  getVerificationHistory,
  getSystemStatus,
} from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [businesses, setBusinesses] = useState([]);
  const [history, setHistory] = useState([]);
  const [system, setSystem] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [
        dashboardStats,
        businessData,
        verificationData,
        systemStatus,
      ] = await Promise.all([
        getDashboardStats(),
        getBusinesses(),
        getVerificationHistory(),
        getSystemStatus(),
      ]);

      setStats(dashboardStats);
      setBusinesses(businessData);
      setHistory(verificationData);
      setSystem(systemStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h2>Loading Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="page">

      <h1 className="page-title">
        AI Business Verification Dashboard
      </h1>

      {/* Statistics */}

      <div className="cards-row">

        <StatusCard
          title="Businesses"
          value={stats.total_businesses || 0}
          color="#4f8ef7"
        />

        <StatusCard
          title="Verified"
          value={stats.verified_businesses || 0}
          color="#4fcf70"
        />

        <StatusCard
          title="Needs Review"
          value={stats.needs_review || 0}
          color="#f7a94f"
        />

        <StatusCard
          title="Average Confidence"
          value={`${stats.average_confidence || 0}%`}
          color="#9b59b6"
        />

      </div>

      {/* System Status */}

      <div className="section">

        <h2>System Status</h2>

        <table className="biz-table">
          <tbody>
            <tr>
              <td>API</td>
              <td>{system.api}</td>
            </tr>

            <tr>
              <td>Database</td>
              <td>{system.database}</td>
            </tr>

            <tr>
              <td>Chromium</td>
              <td>{system.chromium}</td>
            </tr>
          </tbody>
        </table>

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

            {businesses.slice(0, 5).map((business) => (

              <tr key={business.business_id}>

                <td>{business.business_name}</td>

                <td>{business.industry || "-"}</td>

                <td>

                  <span
                    className={`badge ${
                      business.business_status === "Verified"
                        ? "badge-green"
                        : "badge-yellow"
                    }`}
                  >
                    {business.business_status}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* Recent Verification History */}

      <div className="section">

        <h2>Recent Verification Activity</h2>

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

            {history.slice(0, 5).map((item) => (

              <tr key={item.verification_id}>

                <td>{item.business_name}</td>

                <td>{item.verification_status}</td>

                <td>{item.confidence_score}%</td>

                <td>
                  {new Date(item.verified_at).toLocaleDateString()}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}