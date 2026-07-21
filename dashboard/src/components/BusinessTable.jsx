export default function BusinessTable({ businesses, onEdit, onDelete }) {
  if (!businesses || businesses.length === 0) {
    return <p className="empty-msg">No businesses found.</p>;
  }

  return (
    <table className="biz-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Industry</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {businesses.map((b) => (
          <tr key={b.id}>
            <td>{b.name}</td>
            <td>{b.industry}</td>
            <td>{b.phone}</td>
            <td>{b.email}</td>
            <td>
              <span className={`badge ${b.status === "Verified" ? "badge-green" : "badge-yellow"}`}>
                {b.status}
              </span>
            </td>
            <td>
              <button className="btn-sm btn-edit"   onClick={() => onEdit(b)}>Edit</button>
              <button className="btn-sm btn-delete" onClick={() => onDelete(b.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}