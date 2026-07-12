import { useEffect, useState } from "react";
import * as maintenanceApi from "../api/maintenance";
import * as vehiclesApi from "../api/vehicles";
import { statusLabel } from "../constants";
import MaintenanceForm from "../components/MaintenanceForm";

export default function MaintenancePage() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ vehicle: "", status: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    vehiclesApi.listVehicles().then((v) => {
      setVehicles(v);
      setVehiclesLoaded(true);
    });
  }, []);

  useEffect(() => {
    load();
  }, [filters]);

  function load() {
    setLoading(true);
    setError(null);
    maintenanceApi
      .listMaintenanceLogs(filters)
      .then(setLogs)
      .catch(() => setError("Failed to load maintenance logs."))
      .finally(() => setLoading(false));
  }

  function refreshVehicles() {
    vehiclesApi.listVehicles().then(setVehicles);
  }

  function vehicleLabel(id) {
    const v = vehicles.find((v) => v.id === id);
    return v ? v.registration_number : `#${id}`;
  }

  async function handleCreate(values) {
    setSubmitting(true);
    setError(null);
    try {
      await maintenanceApi.createMaintenanceLog(values);
      setFormOpen(false);
      load();
      refreshVehicles();
    } catch (err) {
      setError(err.message || "Failed to open maintenance log.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(log) {
    setActingId(log.id);
    setError(null);
    try {
      await maintenanceApi.closeMaintenanceLog(log.id);
      load();
      refreshVehicles();
    } catch (err) {
      setError(err.message || "Failed to close maintenance log.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Maintenance</h1>
        <button
          type="button"
          className="btn btn-primary btn-inline"
          onClick={() => setFormOpen(true)}
          disabled={!vehiclesLoaded}
          title={vehiclesLoaded ? undefined : "Loading vehicles…"}
        >
          + New Maintenance Log
        </button>
      </div>

      <div className="filters">
        <label className="field field-inline">
          <span>Vehicle</span>
          <select
            value={filters.vehicle}
            onChange={(e) => setFilters((f) => ({ ...f, vehicle: e.target.value }))}
          >
            <option value="">All</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number}
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
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
      </div>

      {formOpen && (
        <MaintenanceForm
          vehicles={vehicles}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      )}

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : logs.length === 0 ? (
        <p className="empty-state">No maintenance logs match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Reason</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Started</th>
                <th>Closed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{vehicleLabel(log.vehicle)}</td>
                  <td>{log.reason}</td>
                  <td>{log.cost}</td>
                  <td>
                    <span className={"status-badge status-" + log.status.toLowerCase()}>
                      {statusLabel(log.status)}
                    </span>
                  </td>
                  <td>{new Date(log.started_at).toLocaleString()}</td>
                  <td>{log.closed_at ? new Date(log.closed_at).toLocaleString() : "—"}</td>
                  <td>
                    {log.status === "OPEN" && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleClose(log)}
                        disabled={actingId === log.id}
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
