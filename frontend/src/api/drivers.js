import { apiFetch, USE_MOCKS, mockDelay, mockError } from "./client";
import { mockDrivers } from "./mockData";

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export async function listDrivers(params = {}) {
  if (USE_MOCKS) {
    const results = mockDrivers.filter((d) => {
      if (params.status && d.status !== params.status) return false;
      return true;
    });
    return mockDelay(results);
  }
  return apiFetch("/drivers/", { params });
}

export async function getDriver(id) {
  if (USE_MOCKS) {
    const found = mockDrivers.find((d) => d.id === Number(id));
    if (!found) return mockError(404, { detail: "Not found." });
    return mockDelay(found);
  }
  return apiFetch(`/drivers/${id}/`);
}

export async function createDriver(data) {
  if (USE_MOCKS) {
    const now = new Date().toISOString();
    const driver = {
      id: nextId(mockDrivers),
      status: "AVAILABLE",
      safety_score: 100,
      ...data,
      created_at: now,
    };
    mockDrivers.push(driver);
    return mockDelay(driver);
  }
  return apiFetch("/drivers/", { method: "POST", body: data });
}

export async function updateDriver(id, data) {
  if (USE_MOCKS) {
    const driver = mockDrivers.find((d) => d.id === Number(id));
    if (!driver) return mockError(404, { detail: "Not found." });
    Object.assign(driver, data);
    return mockDelay(driver);
  }
  return apiFetch(`/drivers/${id}/`, { method: "PATCH", body: data });
}

export async function deleteDriver(id) {
  if (USE_MOCKS) {
    const driver = mockDrivers.find((d) => d.id === Number(id));
    if (!driver) return mockError(404, { detail: "Not found." });
    if (driver.status === "ON_TRIP") {
      return mockError(400, { detail: "Cannot delete a driver that is currently On Trip." });
    }
    const index = mockDrivers.indexOf(driver);
    mockDrivers.splice(index, 1);
    return mockDelay(null);
  }
  return apiFetch(`/drivers/${id}/`, { method: "DELETE" });
}

export function isLicenseExpired(driver) {
  return new Date(driver.license_expiry) < new Date();
}
