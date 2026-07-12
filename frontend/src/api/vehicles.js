import { apiFetch, USE_MOCKS, mockDelay, mockError } from "./client";
import { mockVehicles } from "./mockData";

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export async function listVehicles(params = {}) {
  if (USE_MOCKS) {
    const results = mockVehicles.filter((v) => {
      if (params.type && v.type !== params.type) return false;
      if (params.status && v.status !== params.status) return false;
      if (params.region && v.region !== params.region) return false;
      return true;
    });
    return mockDelay(results);
  }
  return apiFetch("/vehicles/", { params });
}

export async function getVehicle(id) {
  if (USE_MOCKS) {
    const found = mockVehicles.find((v) => v.id === Number(id));
    if (!found) return mockError(404, { detail: "Not found." });
    return mockDelay(found);
  }
  return apiFetch(`/vehicles/${id}/`);
}

export async function createVehicle(data) {
  if (USE_MOCKS) {
    const dup = mockVehicles.some((v) => v.registration_number === data.registration_number);
    if (dup) {
      return mockError(400, {
        registration_number: ["vehicle with this registration number already exists."],
      });
    }
    const now = new Date().toISOString();
    const vehicle = {
      id: nextId(mockVehicles),
      status: "AVAILABLE",
      ...data,
      created_at: now,
      updated_at: now,
    };
    mockVehicles.push(vehicle);
    return mockDelay(vehicle);
  }
  return apiFetch("/vehicles/", { method: "POST", body: data });
}

export async function updateVehicle(id, data) {
  if (USE_MOCKS) {
    const vehicle = mockVehicles.find((v) => v.id === Number(id));
    if (!vehicle) return mockError(404, { detail: "Not found." });
    if (
      data.registration_number &&
      mockVehicles.some((v) => v.id !== Number(id) && v.registration_number === data.registration_number)
    ) {
      return mockError(400, {
        registration_number: ["vehicle with this registration number already exists."],
      });
    }
    Object.assign(vehicle, data, { updated_at: new Date().toISOString() });
    return mockDelay(vehicle);
  }
  return apiFetch(`/vehicles/${id}/`, { method: "PATCH", body: data });
}

export async function deleteVehicle(id) {
  if (USE_MOCKS) {
    const vehicle = mockVehicles.find((v) => v.id === Number(id));
    if (!vehicle) return mockError(404, { detail: "Not found." });
    if (vehicle.status === "ON_TRIP") {
      return mockError(400, { detail: "Cannot delete a vehicle that is currently On Trip." });
    }
    const index = mockVehicles.indexOf(vehicle);
    mockVehicles.splice(index, 1);
    return mockDelay(null);
  }
  return apiFetch(`/vehicles/${id}/`, { method: "DELETE" });
}
