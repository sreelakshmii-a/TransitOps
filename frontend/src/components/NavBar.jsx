import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Nav visibility per role — shape only, no server enforcement yet (that's Hour 3).
// Interpreted from the PRD's role descriptions + TASKS.md's RBAC ownership note;
// not an explicit table in either doc — flagged in IMPLEMENTATION.md to confirm
// against Dev A's actual HasRole guards once those land.
const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", roles: ["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
  { to: "/vehicles", label: "Vehicles", roles: ["FLEET_MANAGER"] },
  { to: "/drivers", label: "Drivers", roles: ["FLEET_MANAGER", "SAFETY_OFFICER"] },
  { to: "/trips", label: "Trips", roles: ["FLEET_MANAGER", "DRIVER"] },
  { to: "/maintenance", label: "Maintenance", roles: ["FLEET_MANAGER", "SAFETY_OFFICER"] },
  { to: "/fuel-expenses", label: "Fuel & Expenses", roles: ["FLEET_MANAGER", "FINANCIAL_ANALYST"] },
];

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">TransitOps</div>
      <nav className="navbar-links">
        {NAV_LINKS.filter((link) => user && link.roles.includes(user.role)).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="navbar-user">
        {user && (
          <>
            <span className="navbar-user-info">
              {user.username} <span className="role-badge">{user.role}</span>
            </span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
