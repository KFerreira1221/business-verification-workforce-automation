import { useEffect, useState } from "react";
import {
  getDashboardStats,
  getVerificationHistory,
} from "../api";

export default function Reports() {
  const [stats, setStats] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const [dashboardStats, verificationHistory] =
        await Promise.all([
          getDashboardStats(),
          getVerificationHistory(),
        ]);

      setStats(dashboardStats);
      setHistory(verificationHistory);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }

  function generateReport() {
    window.print();
  }

  function downloadJSON() {
    const blob = new Blob(
      [JSON.stringify(history, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "verification-report.json";

    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="page">
        <h2>Loading Reports...</h2>
      </div>
    );
  }

  return (
    <div className="page">

      <h1 className="page-title">
        Reports & Analytics
      </h1>

      <div className="cards-row">

        <div className="status-card">
          <h3>Total Businesses</h3>
          <h1>{stats.total_businesses || 0}</h1>
        </div>

        <div className="status-card">
          <h3>Verified</h3>
          <h1>{stats.verified_businesses || 0}</h1>
        </div>

        <div className="status-card">
          <h3>Needs Review</h3>
          <h1>{stats.needs_review || 0}</h1>
        </div>

        <div className="status-card">
          <h3>Average Confidence</h3>
          <h1>{stats.average_confidence || 0}%</h1>
        </div>

      </div>

      <div className="section">

        <h2>Verification Summary</h2>

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

            {history.map((item) => (

              <tr key={item.verification_id}>

                <td>{item.business_name}</td>

                <td>

                  <span
                    className={`badge ${
                      item.verification_status === "Verified"
                        ? "badge-green"
                        : "badge-yellow"
                    }`}
                  >
                    {item.verification_status}
                  </span>

                </td>

                <td>{item.confidence_score}%</td>

                <td>
                  {new Date(item.verified_at).toLocaleDateString()}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <div
        style={{
          display: "flex",
          gap: "15px",
          marginTop: "20px",
        }}
      >

        <button
          className="btn-primary"
          onClick={generateReport}
        >
          🖨 Generate Printable Report
        </button>

        <button
          className="btn-secondary"
          onClick={downloadJSON}
        >
          ⬇ Download JSON
        </button>

      </div>

    </div>
  );
}