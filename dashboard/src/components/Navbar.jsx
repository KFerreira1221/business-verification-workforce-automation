import { Link, useLocation } from "react-router-dom";

const links = [
  {
    path: "/",
    label: "Dashboard",
  },
  {
    path: "/businesses",
    label: "Businesses",
  },
  {
    path: "/upload",
    label: "Document Center",
  },
  {
    path: "/verification",
    label: "Verification",
  },
  {
    path: "/reports",
    label: "Reports",
  },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">

      <div className="navbar-brand">
        🤖 AI Business Verification
      </div>

      <ul className="navbar-links">

        {links.map((link) => (
          <li key={link.path}>

            <Link
              to={link.path}
              className={
                pathname === link.path
                  ? "active"
                  : ""
              }
            >
              {link.label}
            </Link>

          </li>
        ))}

      </ul>

    </nav>
  );
}
