import { useEffect, useState } from "react";
import * as tripsApi from "../api/trips";
import * as dispatchApi from "../api/dispatch";
import * as vehiclesApi from "../api/vehicles";
import * as driversApi from "../api/drivers";
import { ApiError } from "../api/client";
import { downloadReportCsv } from "../api/reports";
import { useAuth } from "../context/AuthContext";
import { TRIP_STATUSES, DISPATCH_REASON_MESSAGES, statusLabel } from "../constants";
import TripForm from "../components/TripForm";

// "Driver can only act on their own trip" — TASKS.md's own-trip scoping requirement.
// Fleet Manager gets full access; other roles that can see this page get none (view only).
function canActOnTrip(user, trip) {
  if (user.role === "FLEET_MANAGER") return true;
  if (user.role === "DRIVER") return trip.driver === user.driver_id;
  return false;
}

export default function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "", region: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [actionErrors, setActionErrors] = useState({});
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    Promise.all([vehiclesApi.listVehicles(), driversApi.listDrivers()]).then(([v, d]) => {
      setVehicles(v);
      setDrivers(d);
      setRefsLoaded(true);
    });
  }, []);

  useEffect(() => {
    load();
  }, [filters]);

  function load() {
    setLoading(true);
    setError(null);
    tripsApi
      .listTrips(filters)
      .then(setTrips)
      .catch(() => setError("Failed to load trips."))
      .finally(() => setLoading(false));
  }

  function vehicleLabel(id) {
    const v = vehicles.find((v) => v.id === id);
    return v ? v.registration_number : `#${id}`;
  }

  function driverLabel(id) {
    const d = drivers.find((d) => d.id === id);
    return d ? d.name : `#${id}`;
  }

  const regions = [...new Set(vehicles.map((v) => v.region))];

  async function handleCreate(values) {
    setSubmitting(true);
    setFieldErrors(null);
    try {
      await tripsApi.createTrip(values);
      setFormOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setError(err.message || "Failed to create trip.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispatch(trip) {
    setActingId(trip.id);
    setActionErrors((prev) => ({ ...prev, [trip.id]: null }));
    try {
      await dispatchApi.dispatchTrip(trip.id);
      load();
      // vehicle/driver statuses changed too — refresh those lists so the form's
      // "available only" selects stay accurate on next open.
      refreshRefs();
    } catch (err) {
      const message =
        err instanceof ApiError && err.reason
          ? DISPATCH_REASON_MESSAGES[err.reason] || err.reason
          : "Dispatch failed.";
      setActionErrors((prev) => ({ ...prev, [trip.id]: message }));
    } finally {
      setActingId(null);
    }
  }

  function refreshRefs() {
    Promise.all([vehiclesApi.listVehicles(), driversApi.listDrivers()]).then(([v, d]) => {
      setVehicles(v);
      setDrivers(d);
    });
  }

  async function handleComplete(trip) {
    setActingId(trip.id);
    try {
      await tripsApi.completeTrip(trip.id);
      load();
      refreshRefs();
    } catch (err) {
      setActionErrors((prev) => ({ ...prev, [trip.id]: err.message || "Complete failed." }));
    } finally {
      setActingId(null);
    }
  }

  async function handleCancel(trip) {
    setActingId(trip.id);
    try {
      await tripsApi.cancelTrip(trip.id);
      load();
      refreshRefs();
    } catch (err) {
      setActionErrors((prev) => ({ ...prev, [trip.id]: err.message || "Cancel failed." }));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Trips</h1>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => downloadReportCsv("trips")}>
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            onClick={() => setFormOpen(true)}
            disabled={!refsLoaded}
            title={refsLoaded ? undefined : "Loading vehicles and drivers…"}
          >
            + New Trip
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="field field-inline">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            {TRIP_STATUSES.map((s) => (
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

      {formOpen && (
        <TripForm
          vehicles={vehicles}
          drivers={drivers}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
          fieldErrors={fieldErrors}
        />
      )}

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : trips.length === 0 ? (
        <p className="empty-state">No trips match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Distance (km)</th>
                <th>Cargo (kg)</th>
                <th>Status</th>
                <th>Dispatched</th>
                <th>Completed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => {
                const canAct = canActOnTrip(user, t);
                const busy = actingId === t.id;
                return (
                  <tr key={t.id}>
                    <td>{vehicleLabel(t.vehicle)}</td>
                    <td>{driverLabel(t.driver)}</td>
                    <td>
                      {t.origin} → {t.destination}
                    </td>
                    <td>{t.distance_km ?? "—"}</td>
                    <td>{t.cargo_weight}</td>
                    <td>
                      <span className={"status-badge status-" + t.status.toLowerCase()}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td>{t.dispatched_at ? new Date(t.dispatched_at).toLocaleString() : "—"}</td>
                    <td>{t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}</td>
                    <td className="table-actions">
                      {t.status === "DRAFT" && canAct && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDispatch(t)}
                          disabled={busy}
                        >
                          Dispatch
                        </button>
                      )}
                      {t.status === "DISPATCHED" && canAct && (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleComplete(t)}
                            disabled={busy}
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-danger"
                            onClick={() => handleCancel(t)}
                            disabled={busy}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {actionErrors[t.id] && <div className="field-error">{actionErrors[t.id]}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
