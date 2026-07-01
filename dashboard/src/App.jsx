import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Businesses from "./pages/Businesses";
import Upload from "./pages/Upload";
import Verification from "./pages/Verification";
import Reports from "./pages/Reports";

function App() {

  return (

    <BrowserRouter>

      <nav>

        <Link to="/">Dashboard</Link> |{" "}
        <Link to="/businesses">Businesses</Link> |{" "}
        <Link to="/upload">Upload</Link> |{" "}
        <Link to="/verification">Verification</Link> |{" "}
        <Link to="/reports">Reports</Link>

      </nav>

      <hr />

      <Routes>

        <Route path="/" element={<Dashboard />} />

        <Route path="/businesses" element={<Businesses />} />

        <Route path="/upload" element={<Upload />} />

        <Route path="/verification" element={<Verification />} />

        <Route path="/reports" element={<Reports />} />

      </Routes>

    </BrowserRouter>

  );

}

export default App;