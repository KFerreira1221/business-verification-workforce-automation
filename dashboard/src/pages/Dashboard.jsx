function Dashboard() {
  return (
    <div className="container">

      <h1>AI Business Verification & Workforce Automation</h1>

      <p>
        Intelligent business verification, document processing,
        and workforce automation powered by Artificial Intelligence.
      </p>

      <div className="cards">

        <div className="card">
          <h3>Businesses</h3>
          <h2>50</h2>
          <p>Registered companies in the system</p>
        </div>

        <div className="card">
          <h3>Documents</h3>
          <h2>120</h2>
          <p>Employee and business documents uploaded</p>
        </div>

        <div className="card">
          <h3>Verified</h3>
          <h2>44</h2>
          <p>Businesses successfully verified by AI</p>
        </div>

        <div className="card">
          <h3>Pending Review</h3>
          <h2>6</h2>
          <p>Awaiting administrator approval</p>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;