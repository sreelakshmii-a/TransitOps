import { useEffect, useRef, useState } from "react";
import * as tripsApi from "../api/trips";
import * as vehiclesApi from "../api/vehicles";
import * as driversApi from "../api/drivers";
import { useAuth } from "../context/AuthContext";
import { IconClock, IconRoute, IconCheck } from "../components/icons";
import PendingTripModal from "../components/PendingTripModal";
import DualMetricCard from "../components/DualMetricCard";
import Donut from "../components/Donut";
import { hoursWorked } from "../utils/dateBuckets";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // Auto-open the pending-requests modal once per session load, not on every
  // refetch (e.g. after accepting one of several) — the modal itself keeps
  // showing any trips still pending; this ref just stops it re-popping open
  // right after the user dismisses it mid-session.
  const autoShown = useRef(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    Promise.all([tripsApi.listTrips(), vehiclesApi.listVehicles(), driversApi.getDriver(user.driver_id)])
      .then(([allTrips, allVehicles, driverRecord]) => {
        const own = allTrips.filter((t) => t.driver === user.driver_id);
        setTrips(own);
        setVehicles(allVehicles);
        setDriver(driverRecord);
        if (!autoShown.current && own.some((t) => t.status === "DRAFT")) {
          setShowModal(true);
          autoShown.current = true;
        }
      })
      .finally(() => setLoading(false));
  }

  function vehicleLabel(id) {
    const v = vehicles.find((v) => v.id === id);
    return v ? v.registration_number : `#${id}`;
  }

  function handleAccepted() {
    load();
  }

  if (loading) return <p>Loading…</p>;

  const pending = trips.filter((t) => t.status === "DRAFT");
  const active = trips.filter((t) => t.status === "DISPATCHED");
  const completed = trips.filter((t) => t.status === "COMPLETED");
  const completedCount = completed.length;
  const totalDistance = completed.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  const totalHours = hoursWorked(completed);

  return (
    <div>
      <div className="page-header">
        <h1>My Dashboard</h1>
      </div>

      {showModal && (
        <PendingTripModal
          trips={pending}
          vehicleLabel={vehicleLabel}
          onAccepted={handleAccepted}
          onDismiss={() => setShowModal(false)}
        />
      )}

      <div className="kpi-grid">
        <button
          type="button"
          className="kpi-tile kpi-tile-clickable"
          onClick={() => setShowModal(true)}
          disabled={pending.length === 0}
          title={pending.length > 0 ? "View pending trip requests" : undefined}
        >
          <div className="kpi-icon" style={{ background: "var(--warning-wash)", color: "var(--warning)" }}>
            <IconClock />
          </div>
          <div>
            <div className="kpi-value">{pending.length}</div>
            <div className="kpi-label">Pending Requests</div>
          </div>
        </button>

        <div className="kpi-tile">
          <div className="kpi-icon" style={{ background: "var(--accent-wash)", color: "var(--accent)" }}>
            <IconRoute />
          </div>
          <div>
            <div className="kpi-value">{active.length}</div>
            <div className="kpi-label">Active Trip</div>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-icon" style={{ background: "var(--good-wash)", color: "var(--good)" }}>
            <IconCheck />
          </div>
          <div>
            <div className="kpi-value">{completedCount}</div>
            <div className="kpi-label">Completed Trips</div>
          </div>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="chart-card">
          <h2>Safety Score</h2>
          <p className="section-note">Tracked by your Safety Officer from trip and compliance history.</p>
          <Donut value={driver?.safety_score ?? 0} max={100} suffix="/100" />
        </div>

        <DualMetricCard
          metrics={[
            { label: "Total Distance", value: totalDistance, unit: "km" },
            { label: "Hours Worked", value: totalHours, unit: "hrs" },
          ]}
          caption="All-time, completed trips"
        />
      </div>
    </div>
  );
}
