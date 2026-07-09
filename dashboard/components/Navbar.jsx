import { Link, useLocation } from "react-router-dom";

const links = [
  { path: "/",             label: "Dashboard" },
  { path: "/businesses",  label: "Businesses" },
  { path: "/upload",      label: "Upload" },
  { path: "/verification",label: "Verification" },
  { path: "/reports",     label: "Reports" },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        🤖 AI Business Verification
      </div>
      <ul className="navbar-links">
        {links.map((l) => (
          <li key={l.path}>
            <Link
              to={l.path}
              className={pathname === l.path ? "active" : ""}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}