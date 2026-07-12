import { useState } from "react";
import { VEHICLE_STATUSES, statusLabel } from "../constants";

const EMPTY = {
  registration_number: "",
  model: "",
  type: "",
  capacity: "",
  odometer: "",
  acquisition_cost: "",
  status: "AVAILABLE",
  region: "",
};

export default function VehicleForm({ initialValues, onSubmit, onCancel, submitting, fieldErrors }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const isEdit = Boolean(initialValues);

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...values,
      capacity: Number(values.capacity),
      odometer: Number(values.odometer),
      acquisition_cost: String(values.acquisition_cost),
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? "Edit Vehicle" : "New Vehicle"}</h3>
      <div className="form-grid">
        <label className="field">
          <span>Registration Number</span>
          <input
            value={values.registration_number}
            onChange={(e) => handleChange("registration_number", e.target.value)}
            required
            disabled={isEdit}
          />
          {fieldErrors?.registration_number && (
            <span className="field-error">{fieldErrors.registration_number[0]}</span>
          )}
        </label>

        <label className="field">
          <span>Model</span>
          <input value={values.model} onChange={(e) => handleChange("model", e.target.value)} required />
        </label>

        <label className="field">
          <span>Type</span>
          <input
            value={values.type}
            onChange={(e) => handleChange("type", e.target.value)}
            required
            placeholder="Van, Truck, ..."
          />
        </label>

        <label className="field">
          <span>Region</span>
          <input value={values.region} onChange={(e) => handleChange("region", e.target.value)} required />
        </label>

        <label className="field">
          <span>Max Load Capacity (kg)</span>
          <input
            type="number"
            min="0"
            value={values.capacity}
            onChange={(e) => handleChange("capacity", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Odometer (km)</span>
          <input
            type="number"
            min="0"
            value={values.odometer}
            onChange={(e) => handleChange("odometer", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Acquisition Cost</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.acquisition_cost}
            onChange={(e) => handleChange("acquisition_cost", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select value={values.status} onChange={(e) => handleChange("status", e.target.value)}>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create vehicle"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
