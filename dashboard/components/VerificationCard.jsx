export default function VerificationCard({ result, onApprove, onReject }) {
  if (!result) return null;

  const { business, website, phone, email, confidence, recommendation } = result;

  return (
    <div className="verification-card">
      <h3>Verification Results</h3>
      <table className="v-table">
        <tbody>
          <tr><td>Business</td><td><strong>{business}</strong></td></tr>
          <tr>
            <td>Website</td>
            <td><span className="badge badge-green">{website}</span></td>
          </tr>
          <tr>
            <td>Phone</td>
            <td><span className="badge badge-green">{phone}</span></td>
          </tr>
          <tr>
            <td>Email</td>
            <td><span className="badge badge-green">{email}</span></td>
          </tr>
          <tr>
            <td>Confidence</td>
            <td><strong>{confidence}%</strong></td>
          </tr>
          <tr>
            <td>AI Recommendation</td>
            <td>
              <span className={`badge ${recommendation === "APPROVE" ? "badge-green" : "badge-red"}`}>
                {recommendation}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="v-actions">
        <button className="btn-approve" onClick={() => onApprove(result)}>✅ Approve</button>
        <button className="btn-reject"  onClick={() => onReject(result)}>❌ Reject</button>
      </div>
    </div>
  );
}