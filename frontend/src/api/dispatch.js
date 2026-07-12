import { apiFetch, USE_MOCKS, mockDelay, mockError } from "./client";
import { mockTrips, mockVehicles, mockDrivers } from "./mockData";

// Mirrors dispatch/services.py's dispatch_trip: same four business rules, same
// {"reason": str, "code": str} 409 shape frozen at contract lock. Real backend does this
// inside a DB transaction with select_for_update(); the mock is single-threaded so there's
// no race to simulate, just the same validation order and outcomes.
export async function dispatchTrip(tripId) {
  if (USE_MOCKS) {
    const trip = mockTrips.find((t) => t.id === Number(tripId));
    if (!trip) return mockError(404, { detail: "Not found." });

    const vehicle = mockVehicles.find((v) => v.id === trip.vehicle);
    const driver = mockDrivers.find((d) => d.id === trip.driver);

    if (!vehicle || vehicle.status !== "AVAILABLE") {
      return mockError(409, { reason: "vehicle_unavailable", code: "VEHICLE_UNAVAILABLE" });
    }
    if (!driver || driver.status !== "AVAILABLE") {
      return mockError(409, { reason: "driver_unavailable", code: "DRIVER_UNAVAILABLE" });
    }
    if (new Date(driver.license_expiry) < new Date()) {
      return mockError(409, { reason: "license_expired", code: "LICENSE_EXPIRED" });
    }
    if (trip.cargo_weight > vehicle.capacity) {
      return mockError(409, { reason: "cargo_exceeds_capacity", code: "CARGO_EXCEEDS_CAPACITY" });
    }

    vehicle.status = "ON_TRIP";
    driver.status = "ON_TRIP";
    trip.status = "DISPATCHED";
    trip.dispatched_at = new Date().toISOString();

    return mockDelay({ success: true });
  }
  return apiFetch(`/dispatch/${tripId}/`, { method: "POST" });
}
