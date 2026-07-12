import { useState } from "react";
import * as dispatchApi from "../api/dispatch";
import { DISPATCH_REASON_MESSAGES } from "../constants";
import { ApiError } from "../api/client";

// Pops up on the driver's dashboard when they have Draft trips already assigned to
// them — the closest thing our data model has to a "trip request" awaiting their
// response (see IMPLEMENTATION.md). Accept dispatches right there; Dismiss just
// closes the modal for this session, the trip is still reachable from Trips.
export default function PendingTripModal({ trips, vehicleLabel, onAccepted, onDismiss }) {
  const [actingId, setActingId] = useState(null);
  const [errors, setErrors] = useState({});

  if (trips.length === 0) return null;

  async function handleAccept(trip) {
    setActingId(trip.id);
    setErrors((prev) => ({ ...prev, [trip.id]: null }));
    try {
      await dispatchApi.dispatchTrip(trip.id);
      onAccepted(trip.id);
    } catch (err) {
      const message =
        err instanceof ApiError && err.reason
          ? DISPATCH_REASON_MESSAGES[err.reason] || err.reason
          : "Couldn't dispatch this trip.";
      setErrors((prev) => ({ ...prev, [trip.id]: message }));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>
          {trips.length === 1 ? "You have a new trip request" : `You have ${trips.length} new trip requests`}
        </h2>
        <p className="section-note">These trips are assigned to you and waiting to be dispatched.</p>

        <div className="modal-trip-list">
          {trips.map((trip) => (
            <div className="modal-trip-row" key={trip.id}>
              <div>
                <div className="modal-trip-route">
                  {trip.origin} → {trip.destination}
                </div>
                <div className="modal-trip-meta">
                  {vehicleLabel(trip.vehicle)} · {trip.cargo_weight} kg
                </div>
                {errors[trip.id] && <div className="field-error">{errors[trip.id]}</div>}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-inline"
                onClick={() => handleAccept(trip)}
                disabled={actingId === trip.id}
              >
                {actingId === trip.id ? "Accepting…" : "Accept"}
              </button>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
