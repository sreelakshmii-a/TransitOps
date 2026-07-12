import { useEffect, useState } from "react";
import * as dashboardApi from "../api/dashboard";
import * as vehiclesApi from "../api/vehicles";
import * as fuelExpensesApi from "../api/fuelExpenses";
import { useAuth } from "../context/AuthContext";
import { VEHICLE_STATUSES, statusLabel } from "../constants";
import { IconTruck, IconCheck, IconWrench, IconRoute, IconClock, IconUsers } from "../components/icons";
import FleetStatusChart from "../components/FleetStatusChart";
import FuelExpenseTrendChart from "../components/FuelExpenseTrendChart";
import LiveTripRoutesPanel from "../components/LiveTripRoutesPanel";
import ExpenseStatusCard from "../components/ExpenseStatusCard";
import Donut from "../components/Donut";

// Fuel/Expense trend (+ its role-specific side panel) is scoped to the two roles
// the user asked for — Fleet Manager gets live trip routes beside it, Financial
// Analyst gets an expense-status read. Safety Officer keeps the plain fleet-status
// view: no trend chart, no side panel, just utilization + status.
const EXPENSE_TREND_ROLES = ["FLEET_MANAGER", "FINANCIAL_ANALYST"];

const TILES = [
  { key: "active_vehicles", label: "Active Vehicles", icon: IconTruck, color: "var(--accent)", wash: "var(--accent-wash)" },
  { key: "available_vehicles", label: "Available Vehicles", icon: IconCheck, color: "var(--good)", wash: "var(--good-wash)" },
  { key: "vehicles_in_maintenance", label: "Vehicles in Maintenance", icon: IconWrench, color: "var(--warning)", wash: "var(--warning-wash)" },
  { key: "active_trips", label: "Active Trips", icon: IconRoute, color: "var(--violet)", wash: "var(--violet-wash)" },
  { key: "pending_trips", label: "Pending Trips", icon: IconClock, color: "var(--aqua)", wash: "var(--aqua-wash)" },
  { key: "drivers_on_duty", label: "Drivers On Duty", icon: IconUsers, color: "var(--accent)", wash: "var(--accent-wash)" },
];

export default function FleetDashboard() {
  const { user } = useAuth();
  const showExpenseTrend = EXPENSE_TREND_ROLES.includes(user?.role);
  const [kpis, setKpis] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState(
    VEHICLE_STATUSES.map((status) => ({ status, count: 0 }))
  );
  const [expenseTrend, setExpenseTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: "", status: "", region: "" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    vehiclesApi.listVehicles().then(setVehicles);
  }, []);

  useEffect(() => {
    if (showExpenseTrend) {
      fuelExpensesApi.getExpenseTrend(8).then(setExpenseTrend);
    }
  }, [showExpenseTrend]);

  useEffect(() => {
    load();
  }, [filters]);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([dashboardApi.getKpis(filters), dashboardApi.getVehicleStatusBreakdown(filters)])
      .then(([kpiData, breakdown]) => {
        setKpis(kpiData);
        setStatusBreakdown(breakdown);
        setLastUpdated(new Date());
      })
      .catch(() => setError("Failed to load KPIs."))
      .finally(() => setLoading(false));
  }

  const types = [...new Set(vehicles.map((v) => v.type))];
  const regions = [...new Set(vehicles.map((v) => v.region))];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button type="button" className="btn btn-ghost btn-inline" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="filters">
        <label className="field field-inline">
          <span>Type</span>
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            <option value="">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-inline">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-inline">
          <span>Region</span>
          <select
            value={filters.region}
            onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
          >
            <option value="">All</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!kpis ? (
        <p>Loading…</p>
      ) : (
        <>
          {showExpenseTrend && expenseTrend && (
            <div className="dashboard-panels">
              <FuelExpenseTrendChart data={expenseTrend} />
              {user.role === "FLEET_MANAGER" ? (
                <LiveTripRoutesPanel />
              ) : (
                <ExpenseStatusCard data={expenseTrend} />
              )}
            </div>
          )}

          <div className="kpi-grid">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <div className="kpi-tile" key={tile.key}>
                  <div className="kpi-icon" style={{ background: tile.wash, color: tile.color }}>
                    <Icon />
                  </div>
                  <div>
                    <div className="kpi-value">{kpis[tile.key]}</div>
                    <div className="kpi-label">{tile.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-panels">
            <div className="chart-card chart-entrance">
              <h2>Fleet Utilization</h2>
              <p className="section-note">Vehicles On Trip as a share of the active fleet (excludes Retired).</p>
              <Donut value={kpis.fleet_utilization} max={100} suffix="%" band="neutral" />
            </div>

            <FleetStatusChart data={statusBreakdown} />
          </div>

          {lastUpdated && <p className="kpi-updated">Last updated {lastUpdated.toLocaleTimeString()}</p>}
        </>
      )}
    </div>
  );
}
