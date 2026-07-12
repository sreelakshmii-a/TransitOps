import { useEffect, useState } from "react";
import * as driversApi from "../api/drivers";
import { ApiError } from "../api/client";
import { DRIVER_STATUSES, statusLabel } from "../constants";
import DriverForm from "../components/DriverForm";

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(null);

  useEffect(() => {
    load();
  }, [filters]);

  function load() {
    setLoading(true);
    setError(null);
    driversApi
      .listDrivers(filters)
      .then(setDrivers)
      .catch(() => setError("Failed to load drivers."))
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setEditingDriver(null);
    setFieldErrors(null);
    setFormOpen(true);
  }

  function openEdit(driver) {
    setEditingDriver(driver);
    setFieldErrors(null);
    setFormOpen(true);
  }

  async function handleSubmit(values) {
    setSubmitting(true);
    setFieldErrors(null);
    try {
      if (editingDriver) {
        await driversApi.updateDriver(editingDriver.id, values);
      } else {
        await driversApi.createDriver(values);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setError(err.message || "Failed to save driver.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(driver) {
    if (!window.confirm(`Delete driver ${driver.name}?`)) return;
    try {
      await driversApi.deleteDriver(driver.id);
      load();
    } catch (err) {
      setError(err.message || "Failed to delete driver.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Drivers</h1>
        <button type="button" className="btn btn-primary btn-inline" onClick={openCreate}>
          + New Driver
        </button>
      </div>

      <div className="filters">
        <label className="field field-inline">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            {DRIVER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {formOpen && (
        <DriverForm
          initialValues={editingDriver}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
          fieldErrors={fieldErrors}
        />
      )}

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : drivers.length === 0 ? (
        <p className="empty-state">No drivers match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>License</th>
                <th>Category</th>
                <th>Expiry</th>
                <th>Contact</th>
                <th>Safety Score</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const expired = driversApi.isLicenseExpired(d);
                return (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.license}</td>
                    <td>{d.license_category}</td>
                    <td>
                      {d.license_expiry}
                      {expired && <span className="tag tag-danger">Expired</span>}
                    </td>
                    <td>{d.contact}</td>
                    <td>{d.safety_score}</td>
                    <td>
                      <span className={"status-badge status-" + d.status.toLowerCase()}>
                        {statusLabel(d.status)}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => handleDelete(d)}
                        disabled={d.status === "ON_TRIP"}
                        title={d.status === "ON_TRIP" ? "Cannot delete a driver that is On Trip" : undefined}
                      >
                        Delete
                      </button>
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
