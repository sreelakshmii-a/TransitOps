import { useState } from "react";
import { isLicenseExpired } from "../api/drivers";

const EMPTY = {
  vehicle: "",
  driver: "",
  cargo_weight: "",
  origin: "",
  destination: "",
  distance_km: "",
};

// Dispatch-selection rule: Retired/In Shop vehicles and expired/suspended/unavailable
// drivers must never appear here (PRD's Mandatory Business Rules).
export default function TripForm({ vehicles, drivers, onSubmit, onCancel, submitting, fieldErrors }) {
  const [values, setValues] = useState(EMPTY);

  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE");
  const availableDrivers = drivers.filter((d) => d.status === "AVAILABLE" && !isLicenseExpired(d));

  const selectedVehicle = availableVehicles.find((v) => v.id === Number(values.vehicle));
  const overCapacity =
    selectedVehicle && values.cargo_weight && Number(values.cargo_weight) > selectedVehicle.capacity;

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      vehicle: Number(values.vehicle),
      driver: Number(values.driver),
      cargo_weight: Number(values.cargo_weight),
      origin: values.origin,
      destination: values.destination,
      distance_km: Number(values.distance_km),
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <h3>New Trip</h3>
      <div className="form-grid">
        <label className="field">
          <span>Vehicle (available only)</span>
          <select value={values.vehicle} onChange={(e) => handleChange("vehicle", e.target.value)} required>
            <option value="" disabled>
              Select a vehicle
            </option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} — {v.model} ({v.capacity} kg)
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Driver (available only)</span>
          <select value={values.driver} onChange={(e) => handleChange("driver", e.target.value)} required>
            <option value="" disabled>
              Select a driver
            </option>
            {availableDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Origin</span>
          <input value={values.origin} onChange={(e) => handleChange("origin", e.target.value)} required />
        </label>

        <label className="field">
          <span>Destination</span>
          <input
            value={values.destination}
            onChange={(e) => handleChange("destination", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Planned Distance (km)</span>
          <input
            type="number"
            min="0"
            value={values.distance_km}
            onChange={(e) => handleChange("distance_km", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Cargo Weight (kg)</span>
          <input
            type="number"
            min="0"
            value={values.cargo_weight}
            onChange={(e) => handleChange("cargo_weight", e.target.value)}
            required
          />
          {overCapacity && (
            <span className="field-error">Exceeds {selectedVehicle.registration_number}'s capacity.</span>
          )}
          {fieldErrors?.cargo_weight && <span className="field-error">{fieldErrors.cargo_weight[0]}</span>}
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting || overCapacity}>
          {submitting ? "Creating…" : "Create trip"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
