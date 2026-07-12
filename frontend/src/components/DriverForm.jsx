import { useState } from "react";
import { DRIVER_STATUSES, statusLabel } from "../constants";

const EMPTY = {
  name: "",
  license: "",
  license_category: "",
  license_expiry: "",
  contact: "",
  safety_score: 100,
  status: "AVAILABLE",
};

export default function DriverForm({ initialValues, onSubmit, onCancel, submitting, fieldErrors }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const isEdit = Boolean(initialValues);

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...values, safety_score: Number(values.safety_score) });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? "Edit Driver" : "New Driver"}</h3>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input value={values.name} onChange={(e) => handleChange("name", e.target.value)} required />
        </label>

        <label className="field">
          <span>License Number</span>
          <input value={values.license} onChange={(e) => handleChange("license", e.target.value)} required />
          {fieldErrors?.license && <span className="field-error">{fieldErrors.license[0]}</span>}
        </label>

        <label className="field">
          <span>License Category</span>
          <input
            value={values.license_category}
            onChange={(e) => handleChange("license_category", e.target.value)}
            required
            placeholder="LMV, HMV, ..."
          />
        </label>

        <label className="field">
          <span>License Expiry</span>
          <input
            type="date"
            value={values.license_expiry}
            onChange={(e) => handleChange("license_expiry", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Contact Number</span>
          <input value={values.contact} onChange={(e) => handleChange("contact", e.target.value)} required />
        </label>

        <label className="field">
          <span>Safety Score</span>
          <input
            type="number"
            min="0"
            max="100"
            value={values.safety_score}
            onChange={(e) => handleChange("safety_score", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select value={values.status} onChange={(e) => handleChange("status", e.target.value)}>
            {DRIVER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create driver"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
