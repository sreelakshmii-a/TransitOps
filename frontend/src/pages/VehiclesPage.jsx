import { useEffect, useState } from "react";
import * as vehiclesApi from "../api/vehicles";
import { ApiError } from "../api/client";
import { VEHICLE_STATUSES, statusLabel } from "../constants";
import VehicleForm from "../components/VehicleForm";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: "", status: "", region: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(null);

  useEffect(() => {
    load();
  }, [filters]);

  function load() {
    setLoading(true);
    setError(null);
    vehiclesApi
      .listVehicles(filters)
      .then(setVehicles)
      .catch(() => setError("Failed to load vehicles."))
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setEditingVehicle(null);
    setFieldErrors(null);
    setFormOpen(true);
  }

  function openEdit(vehicle) {
    setEditingVehicle(vehicle);
    setFieldErrors(null);
    setFormOpen(true);
  }

  async function handleSubmit(values) {
    setSubmitting(true);
    setFieldErrors(null);
    try {
      if (editingVehicle) {
        await vehiclesApi.updateVehicle(editingVehicle.id, values);
      } else {
        await vehiclesApi.createVehicle(values);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setError(err.message || "Failed to save vehicle.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(vehicle) {
    if (!window.confirm(`Delete vehicle ${vehicle.registration_number}?`)) return;
    try {
      await vehiclesApi.deleteVehicle(vehicle.id);
      load();
    } catch (err) {
      setError(err.message || "Failed to delete vehicle.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Vehicles</h1>
        <button type="button" className="btn btn-primary btn-inline" onClick={openCreate}>
          + New Vehicle
        </button>
      </div>

      <div className="filters">
        <label className="field field-inline">
          <span>Type</span>
          <input
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            placeholder="All"
          />
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
          <input
            value={filters.region}
            onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
            placeholder="All"
          />
        </label>
      </div>

      {formOpen && (
        <VehicleForm
          initialValues={editingVehicle}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
          fieldErrors={fieldErrors}
        />
      )}

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : vehicles.length === 0 ? (
        <p className="empty-state">No vehicles match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Type</th>
                <th>Capacity (kg)</th>
                <th>Odometer</th>
                <th>Region</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>{v.registration_number}</td>
                  <td>{v.model}</td>
                  <td>{v.type}</td>
                  <td>{v.capacity}</td>
                  <td>{v.odometer}</td>
                  <td>{v.region}</td>
                  <td>
                    <span className={"status-badge status-" + v.status.toLowerCase()}>
                      {statusLabel(v.status)}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-danger"
                      onClick={() => handleDelete(v)}
                      disabled={v.status === "ON_TRIP"}
                      title={v.status === "ON_TRIP" ? "Cannot delete a vehicle that is On Trip" : undefined}
                    >
                      Delete
                    </button>
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
