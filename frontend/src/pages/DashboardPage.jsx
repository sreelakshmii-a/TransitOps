import { useAuth } from "../context/AuthContext";
import FleetDashboard from "./FleetDashboard";
import DriverDashboard from "./DriverDashboard";

// Role-based switch, not a shared page — each dashboard has different data needs
// (fleet-wide KPIs vs. one driver's own trips), so this stays a thin router rather
// than one component juggling conditional hooks.
export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "DRIVER") return <DriverDashboard />;
  return <FleetDashboard />;
}
