import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconDashboard,
  IconTruck,
  IconUsers,
  IconRoute,
  IconWrench,
  IconFuel,
  IconLogout,
  IconTruckLogo,
} from "./icons";

// Nav visibility per role — shape only, no server enforcement yet (that's Hour 3).
// Interpreted from the PRD's role descriptions + TASKS.md's RBAC ownership note;
// not an explicit table in either doc — flagged in IMPLEMENTATION.md to confirm
// against Dev A's actual HasRole guards once those land.
const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: IconDashboard, roles: ["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
  { to: "/vehicles", label: "Vehicles", icon: IconTruck, roles: ["FLEET_MANAGER"] },
  { to: "/drivers", label: "Drivers", icon: IconUsers, roles: ["FLEET_MANAGER", "SAFETY_OFFICER"] },
  { to: "/trips", label: "Trips", icon: IconRoute, roles: ["FLEET_MANAGER", "DRIVER"] },
  { to: "/maintenance", label: "Maintenance", icon: IconWrench, roles: ["FLEET_MANAGER", "SAFETY_OFFICER"] },
  { to: "/fuel-expenses", label: "Fuel & Expenses", icon: IconFuel, roles: ["FLEET_MANAGER", "FINANCIAL_ANALYST"] },
];

function initials(username) {
  return username.slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <IconTruckLogo width={18} height={18} strokeWidth={2} />
        </span>
        <span className="sidebar-brand-name">TransitOps</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_LINKS.filter((link) => user && link.roles.includes(user.role)).map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <Icon />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <span className="sidebar-avatar">{initials(user.username)}</span>
            <div>
              <div className="sidebar-username">{user.username}</div>
              <div className="role-badge">{user.role}</div>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={logout} title="Logout">
            <IconLogout />
          </button>
        </div>
      )}
    </aside>
  );
}
