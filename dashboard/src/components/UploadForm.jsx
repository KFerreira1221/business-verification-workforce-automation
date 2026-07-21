import { useState } from "react";

export default function UploadForm({ businesses, onUpload }) {
  const [selectedBiz, setSelectedBiz] = useState("");
  const [file, setFile]               = useState(null);
  const [message, setMessage]         = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedBiz || !file) {
      setMessage("Please select a business and a file.");
      return;
    }
    onUpload({ business: selectedBiz, file });
    setMessage(`✅ "${file.name}" uploaded for ${selectedBiz}`);
    setFile(null);
    setSelectedBiz("");
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h3>Upload Document</h3>

      <label>Choose Business</label>
      <select value={selectedBiz} onChange={(e) => setSelectedBiz(e.target.value)}>
        <option value="">-- Select --</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.name}>{b.name}</option>
        ))}
      </select>

      <label>Choose File</label>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button type="submit" className="btn-primary">Upload</button>

      {message && <p className="upload-msg">{message}</p>}
    </form>
  );
}