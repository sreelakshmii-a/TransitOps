import { useEffect, useState } from "react";
import * as tripsApi from "../api/trips";
import * as vehiclesApi from "../api/vehicles";
import * as driversApi from "../api/drivers";
import { statusLabel } from "../constants";

// No lat/lng exists anywhere in the data model (Trip only has origin/destination
// city names) — a literal pin-on-a-map view isn't buildable without fabricating
// geo data. This is the honest equivalent: a live, clickable list of in-progress
// routes with the same "see what's moving, click for details" behavior.
export default function LiveTripRoutesPanel() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  function load() {
    Promise.all([tripsApi.listTrips({ status: "DISPATCHED" }), vehiclesApi.listVehicles(), driversApi.listDrivers()])
      .then(([t, v, d]) => {
        setTrips(t);
        setVehicles(v);
        setDrivers(d);
      })
      .finally(() => setLoading(false));
  }

  function vehicleFor(id) {
    return vehicles.find((v) => v.id === id);
  }
  function driverFor(id) {
    return drivers.find((d) => d.id === id);
  }

  return (
    <div className="chart-card chart-entrance">
      <h2>Live Trip Routes</h2>
      <p className="section-note">Vehicles currently on trip — click a route for driver &amp; vehicle details.</p>

      {loading ? (
        <p>Loading…</p>
      ) : trips.length === 0 ? (
        <p className="empty-state">No trips are currently dispatched.</p>
      ) : (
        <div className="route-list">
          {trips.map((t) => (
            <button type="button" key={t.id} className="route-row" onClick={() => setSelected(t)}>
              <div className="route-row-top">
                <span className="route-city">{t.origin}</span>
                <span className="route-track">
                  <span className="route-dot" />
                  <span className="route-line" />
                  <span className="route-pulse" />
                  <span className="route-dot route-dot-end" />
                </span>
                <span className="route-city">{t.destination}</span>
              </div>
              <div className="route-row-meta">
                {vehicleFor(t.vehicle)?.registration_number || `#${t.vehicle}`} · {driverFor(t.driver)?.name || `#${t.driver}`}
                {t.distance_km ? ` · ${t.distance_km} km` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>
              {selected.origin} → {selected.destination}
            </h2>
            <p className="section-note">
              <span className={"status-badge status-" + selected.status.toLowerCase()}>
                {statusLabel(selected.status)}
              </span>
            </p>

            <div className="detail-section">
              <div className="detail-heading">Vehicle</div>
              {vehicleFor(selected.vehicle) ? (
                <>
                  <div className="detail-row">
                    <span>Registration</span>
                    <strong>{vehicleFor(selected.vehicle).registration_number}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Model</span>
                    <strong>{vehicleFor(selected.vehicle).model}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Capacity</span>
                    <strong>{vehicleFor(selected.vehicle).capacity} kg</strong>
                  </div>
                </>
              ) : (
                <p className="empty-state">Vehicle #{selected.vehicle}</p>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-heading">Driver</div>
              {driverFor(selected.driver) ? (
                <>
                  <div className="detail-row">
                    <span>Name</span>
                    <strong>{driverFor(selected.driver).name}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Contact</span>
                    <strong>{driverFor(selected.driver).contact}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Safety Score</span>
                    <strong>{driverFor(selected.driver).safety_score}/100</strong>
                  </div>
                </>
              ) : (
                <p className="empty-state">Driver #{selected.driver}</p>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
