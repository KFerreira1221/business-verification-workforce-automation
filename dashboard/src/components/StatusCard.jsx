export default function StatusCard({ title, value, color }) {
  return (
    <div className="status-card" style={{ borderTop: `4px solid ${color}` }}>
      <p className="status-card-title">{title}</p>
      <h2 className="status-card-value" style={{ color }}>{value}</h2>
    </div>
  );
}