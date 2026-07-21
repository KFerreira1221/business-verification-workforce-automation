import { useEffect, useState } from "react";
import BusinessTable from "../components/BusinessTable";
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness } from "../api";

const emptyForm = {
  business_name: "", website: "", phone_number: "",
  email: "", industry: "", business_status: "Pending"
};

export default function Businesses() {
  const [businesses, setBusinesses] = useState([]);
  const [form,       setForm]       = useState(emptyForm);
  const [editId,     setEditId]     = useState(null);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [message,    setMessage]    = useState("");

  useEffect(() => { loadBusinesses(); }, []);

  async function loadBusinesses() {
    try {
      const data = await getBusinesses();
      setBusinesses(data);
    } catch (err) {
      console.error("Failed to load businesses:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) {
        await updateBusiness(editId, form);
        setMessage("✅ Business updated!");
        setEditId(null);
      } else {
        await createBusiness(form);
        setMessage("✅ Business created!");
      }
      setForm(emptyForm);
      loadBusinesses();
    } catch (err) {
      setMessage("❌ Error saving business");
    }
  }

  function handleEdit(b) {
    setForm({
      business_name:   b.business_name,
      website:         b.website        || "",
      phone_number:    b.phone_number   || "",
      email:           b.email          || "",
      industry:        b.industry       || "",
      business_status: b.business_status || "Pending",
    });
    setEditId(b.business_id);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this business?")) return;
    try {
      await deleteBusiness(id);
      setMessage("✅ Business deleted!");
      loadBusinesses();
    } catch (err) {
      setMessage("❌ Error deleting business");
    }
  }

  const filtered = businesses.filter((b) =>
    b.business_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h1 className="page-title">Businesses</h1>

      {/* Form */}
      <div className="section">
        <h2>{editId ? "Edit Business" : "+ Add Business"}</h2>
        <form className="biz-form" onSubmit={handleSubmit}>
          <input name="business_name" placeholder="Business Name" value={form.business_name} onChange={handleChange} required />
          <input name="website"       placeholder="Website"       value={form.website}       onChange={handleChange} />
          <input name="phone_number"  placeholder="Phone"         value={form.phone_number}  onChange={handleChange} />
          <input name="email"         placeholder="Email"         value={form.email}         onChange={handleChange} />
          <input name="industry"      placeholder="Industry"      value={form.industry}      onChange={handleChange} />
          <select name="business_status" value={form.business_status} onChange={handleChange}>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Verified">Verified</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button type="submit" className="btn-primary">{editId ? "Update" : "Save"}</button>
          {editId && (
            <button type="button" className="btn-secondary"
              onClick={() => { setEditId(null); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </form>
        {message && <p className="upload-msg">{message}</p>}
      </div>

      {/* Search */}
      <input
        className="search-input"
        placeholder="Search businesses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="section">
        <h2>Business List ({filtered.length})</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <BusinessTable
            businesses={filtered.map((b) => ({
              ...b,
              id:     b.business_id,
              name:   b.business_name,
              phone:  b.phone_number,
              status: b.business_status,
            }))}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}