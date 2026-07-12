import { useState } from "react";

const EMPTY = { vehicle: "", liters: "", cost: "", odometer_at_fill: "" };

export default function FuelLogForm({ vehicles, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(EMPTY);

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      vehicle: Number(values.vehicle),
      liters: values.liters,
      cost: values.cost,
      odometer_at_fill: Number(values.odometer_at_fill),
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <h3>New Fuel Log</h3>
      <div className="form-grid">
        <label className="field">
          <span>Vehicle</span>
          <select value={values.vehicle} onChange={(e) => handleChange("vehicle", e.target.value)} required>
            <option value="" disabled>
              Select a vehicle
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} — {v.model}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Liters</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.liters}
            onChange={(e) => handleChange("liters", e.target.value)}
            required
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

        <label className="field">
          <span>Odometer at Fill</span>
          <input
            type="number"
            min="0"
            value={values.odometer_at_fill}
            onChange={(e) => handleChange("odometer_at_fill", e.target.value)}
            required
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Log fuel"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
