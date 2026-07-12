import { useState } from "react";

const EMPTY = { vehicle: "", reason: "", cost: "" };

export default function MaintenanceForm({ vehicles, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(EMPTY);

  // On Trip vehicles are excluded — opening maintenance mid-trip is the exact bug
  // TASKS.md's council fix calls out; the backend rejects it too as defense in depth.
  const eligibleVehicles = vehicles.filter((v) => v.status !== "ON_TRIP");

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ vehicle: Number(values.vehicle), reason: values.reason, cost: values.cost });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <h3>New Maintenance Log</h3>
      <div className="form-grid">
        <label className="field">
          <span>Vehicle</span>
          <select value={values.vehicle} onChange={(e) => handleChange("vehicle", e.target.value)} required>
            <option value="" disabled>
              Select a vehicle
            </option>
            {eligibleVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} — {v.model}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Reason</span>
          <input
            value={values.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            required
            placeholder="Oil change, brake inspection, ..."
          />
        </label>

        <label className="field">
          <span>Cost</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.cost}
            onChange={(e) => handleChange("cost", e.target.value)}
            required
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Open maintenance log"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
