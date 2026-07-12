import { apiFetch, USE_MOCKS, mockDelay, mockError } from "./client";
import { mockMaintenanceLogs, mockVehicles } from "./mockData";

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export async function listMaintenanceLogs(params = {}) {
  if (USE_MOCKS) {
    const results = mockMaintenanceLogs.filter((m) => {
      if (params.vehicle && m.vehicle !== Number(params.vehicle)) return false;
      if (params.status && m.status !== params.status) return false;
      return true;
    });
    return mockDelay(results);
  }
  return apiFetch("/maintenance/", { params });
}

// Guard against opening maintenance mid-trip — TASKS.md's council fix: nothing should let a
// Fleet Manager put an ON_TRIP vehicle IN_SHOP out from under an active trip.
export async function createMaintenanceLog(data) {
  if (USE_MOCKS) {
    const vehicle = mockVehicles.find((v) => v.id === Number(data.vehicle));
    if (!vehicle) return mockError(404, { detail: "Vehicle not found." });
    if (vehicle.status === "ON_TRIP") {
      return mockError(400, { detail: "Cannot open maintenance on a vehicle that is currently On Trip." });
    }
    const log = {
      id: nextId(mockMaintenanceLogs),
      status: "OPEN",
      started_at: new Date().toISOString(),
      closed_at: null,
      ...data,
      cost: String(data.cost),
    };
    mockMaintenanceLogs.push(log);
    vehicle.status = "IN_SHOP";
    return mockDelay(log);
  }
  return apiFetch("/maintenance/", { method: "POST", body: data });
}

// Restores the vehicle to Available, unless it's Retired (per PRD 4: "Closing maintenance
// restores the vehicle to Available (unless retired)").
export async function closeMaintenanceLog(id) {
  if (USE_MOCKS) {
    const log = mockMaintenanceLogs.find((m) => m.id === Number(id));
    if (!log) return mockError(404, { detail: "Not found." });
    if (log.status === "CLOSED") {
      return mockError(400, { detail: "This maintenance log is already closed." });
    }
    log.status = "CLOSED";
    log.closed_at = new Date().toISOString();
    const vehicle = mockVehicles.find((v) => v.id === log.vehicle);
    if (vehicle && vehicle.status !== "RETIRED") {
      vehicle.status = "AVAILABLE";
    }
    return mockDelay(log);
  }
  return apiFetch(`/maintenance/${id}/close/`, { method: "POST" });
}
