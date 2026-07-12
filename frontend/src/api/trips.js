import { apiFetch, USE_MOCKS, mockDelay, mockError } from "./client";
import { mockTrips, mockVehicles, mockDrivers } from "./mockData";

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function vehicleRegion(vehicleId) {
  return mockVehicles.find((v) => v.id === Number(vehicleId))?.region;
}

export async function listTrips(params = {}) {
  if (USE_MOCKS) {
    const results = mockTrips.filter((t) => {
      if (params.status && t.status !== params.status) return false;
      if (params.region && vehicleRegion(t.vehicle) !== params.region) return false;
      return true;
    });
    return mockDelay(results);
  }
  return apiFetch("/trips/", { params });
}

// Creates a DRAFT trip. Validates cargo_weight <= vehicle.capacity at creation time too
// (fail fast, not just at dispatch) per TASKS.md's trips endpoint contract.
export async function createTrip(data) {
  if (USE_MOCKS) {
    const vehicle = mockVehicles.find((v) => v.id === Number(data.vehicle));
    if (vehicle && Number(data.cargo_weight) > vehicle.capacity) {
      return mockError(400, {
        cargo_weight: [`Cargo weight exceeds vehicle capacity (${vehicle.capacity} kg).`],
      });
    }
    const trip = {
      id: nextId(mockTrips),
      status: "DRAFT",
      dispatched_at: null,
      completed_at: null,
      ...data,
      cargo_weight: Number(data.cargo_weight),
      created_at: new Date().toISOString(),
    };
    mockTrips.push(trip);
    return mockDelay(trip);
  }
  return apiFetch("/trips/", { method: "POST", body: data });
}

// Conditional release, mirroring the backend's filter(status=DISPATCHED).update(...) pattern —
// never blindly overwrites a vehicle maintenance may have since moved to IN_SHOP.
function releaseTrip(trip, finalStatus, timestampField) {
  const vehicle = mockVehicles.find((v) => v.id === trip.vehicle);
  const driver = mockDrivers.find((d) => d.id === trip.driver);
  if (vehicle && vehicle.status === "ON_TRIP") vehicle.status = "AVAILABLE";
  if (driver && driver.status === "ON_TRIP") driver.status = "AVAILABLE";
  trip.status = finalStatus;
  trip[timestampField] = new Date().toISOString();
}

export async function completeTrip(id) {
  if (USE_MOCKS) {
    const trip = mockTrips.find((t) => t.id === Number(id));
    if (!trip) return mockError(404, { detail: "Not found." });
    if (trip.status !== "DISPATCHED") {
      return mockError(409, { reason: "trip_not_dispatched", code: "TRIP_NOT_DISPATCHED" });
    }
    releaseTrip(trip, "COMPLETED", "completed_at");
    return mockDelay(trip);
  }
  return apiFetch(`/trips/${id}/complete/`, { method: "POST" });
}

export async function cancelTrip(id) {
  if (USE_MOCKS) {
    const trip = mockTrips.find((t) => t.id === Number(id));
    if (!trip) return mockError(404, { detail: "Not found." });
    if (trip.status !== "DISPATCHED" && trip.status !== "DRAFT") {
      return mockError(409, { reason: "trip_not_cancellable", code: "TRIP_NOT_CANCELLABLE" });
    }
    releaseTrip(trip, "CANCELLED", "completed_at");
    return mockDelay(trip);
  }
  return apiFetch(`/trips/${id}/cancel/`, { method: "POST" });
}
