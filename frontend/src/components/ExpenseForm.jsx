import { useState } from "react";

const CATEGORIES = ["FUEL", "MAINTENANCE", "TOLL", "OPERATIONAL"];

const EMPTY = { vehicle: "", trip: "", category: "TOLL", amount: "" };

export default function ExpenseForm({ vehicles, trips, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(EMPTY);

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      vehicle: values.vehicle ? Number(values.vehicle) : null,
      trip: values.trip ? Number(values.trip) : null,
      category: values.category,
      amount: values.amount,
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <h3>New Expense</h3>
      <div className="form-grid">
        <label className="field">
          <span>Category</span>
          <select value={values.category} onChange={(e) => handleChange("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Vehicle (optional)</span>
          <select value={values.vehicle} onChange={(e) => handleChange("vehicle", e.target.value)}>
            <option value="">None</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Trip (optional)</span>
          <select value={values.trip} onChange={(e) => handleChange("trip", e.target.value)}>
            <option value="">None</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.origin} → {t.destination}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Log expense"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
