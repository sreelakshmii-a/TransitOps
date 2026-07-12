// Mock fixtures matching the frozen API contract in TASKS.md / users/models.py etc.
// Swapped out once real endpoints are live (see USE_MOCKS in client.js).

export const ROLES = {
  FLEET_MANAGER: "FLEET_MANAGER",
  DRIVER: "DRIVER",
  SAFETY_OFFICER: "SAFETY_OFFICER",
  FINANCIAL_ANALYST: "FINANCIAL_ANALYST",
};

export const mockUsers = [
  { id: 1, username: "fleet_manager", email: "fleet@transitops.test", password: "password123", role: ROLES.FLEET_MANAGER },
  { id: 2, username: "driver_alex", email: "driver@transitops.test", password: "password123", role: ROLES.DRIVER },
  { id: 3, username: "safety_officer", email: "safety@transitops.test", password: "password123", role: ROLES.SAFETY_OFFICER },
  { id: 4, username: "finance_analyst", email: "finance@transitops.test", password: "password123", role: ROLES.FINANCIAL_ANALYST },
];

export const mockVehicles = [
  { id: 1, registration_number: "VAN-05", model: "Tata Ace", type: "Van", capacity: 500, odometer: 12500, acquisition_cost: "850000.00", status: "AVAILABLE", region: "North", created_at: "2026-01-10T09:00:00Z", updated_at: "2026-01-10T09:00:00Z" },
  { id: 2, registration_number: "TRK-11", model: "Ashok Leyland Dost", type: "Truck", capacity: 1500, odometer: 44210, acquisition_cost: "1450000.00", status: "ON_TRIP", region: "South", created_at: "2026-01-11T09:00:00Z", updated_at: "2026-01-11T09:00:00Z" },
  { id: 3, registration_number: "VAN-12", model: "Mahindra Bolero Pickup", type: "Van", capacity: 700, odometer: 8300, acquisition_cost: "920000.00", status: "IN_SHOP", region: "North", created_at: "2026-01-12T09:00:00Z", updated_at: "2026-01-12T09:00:00Z" },
  { id: 4, registration_number: "TRK-02", model: "Eicher Pro 2049", type: "Truck", capacity: 2000, odometer: 61000, acquisition_cost: "1800000.00", status: "RETIRED", region: "West", created_at: "2026-01-13T09:00:00Z", updated_at: "2026-01-13T09:00:00Z" },
];

export const mockDrivers = [
  { id: 1, name: "Alex Menon", license: "KL-05-2020-0011234", license_expiry: "2027-05-01", contact: "9876543210", safety_score: 92, status: "AVAILABLE", created_at: "2026-01-10T09:00:00Z" },
  { id: 2, name: "Priya Nair", license: "KL-07-2019-0089213", license_expiry: "2026-03-01", contact: "9876500011", safety_score: 88, status: "ON_TRIP", created_at: "2026-01-11T09:00:00Z" },
  { id: 3, name: "Ravi Kumar", license: "KL-01-2018-0034521", license_expiry: "2026-08-15", contact: "9876511122", safety_score: 65, status: "SUSPENDED", created_at: "2026-01-12T09:00:00Z" },
  { id: 4, name: "Sneha Thomas", license: "KL-09-2021-0091823", license_expiry: "2026-01-01", contact: "9876522233", safety_score: 78, status: "OFF_DUTY", created_at: "2026-01-13T09:00:00Z" },
];

export const mockTrips = [
  { id: 1, vehicle: 2, driver: 2, cargo_weight: 1200, origin: "Kochi", destination: "Coimbatore", status: "DISPATCHED", dispatched_at: "2026-07-12T08:00:00Z", completed_at: null, created_at: "2026-07-12T07:30:00Z" },
  { id: 2, vehicle: 1, driver: 1, cargo_weight: 450, origin: "Kochi", destination: "Thrissur", status: "DRAFT", dispatched_at: null, completed_at: null, created_at: "2026-07-12T09:00:00Z" },
];

export const mockMaintenanceLogs = [
  { id: 1, vehicle: 3, reason: "Oil change + brake inspection", cost: "4500.00", status: "OPEN", started_at: "2026-07-11T10:00:00Z", closed_at: null },
];

export const mockFuelLogs = [
  { id: 1, vehicle: 1, liters: "35.50", cost: "3200.00", odometer_at_fill: 12400, logged_at: "2026-07-10T08:00:00Z" },
];

export const mockExpenses = [
  { id: 1, vehicle: 2, trip: 1, category: "TOLL", amount: "450.00", date: "2026-07-12T08:10:00Z" },
  { id: 2, vehicle: 3, trip: null, category: "MAINTENANCE", amount: "4500.00", date: "2026-07-11T10:00:00Z" },
];

export function computeMockKpis() {
  const activeVehicles = mockVehicles.filter((v) => v.status === "ON_TRIP").length;
  const availableVehicles = mockVehicles.filter((v) => v.status === "AVAILABLE").length;
  const vehiclesInMaintenance = mockVehicles.filter((v) => v.status === "IN_SHOP").length;
  const activeTrips = mockTrips.filter((t) => t.status === "DISPATCHED").length;
  const pendingTrips = mockTrips.filter((t) => t.status === "DRAFT").length;
  const driversOnDuty = mockDrivers.filter((d) => d.status === "ON_TRIP").length;
  const nonRetired = mockVehicles.filter((v) => v.status !== "RETIRED").length;
  const fleetUtilization = nonRetired > 0 ? (activeVehicles / nonRetired) * 100 : 0;

  return {
    active_vehicles: activeVehicles,
    available_vehicles: availableVehicles,
    vehicles_in_maintenance: vehiclesInMaintenance,
    active_trips: activeTrips,
    pending_trips: pendingTrips,
    drivers_on_duty: driversOnDuty,
    fleet_utilization: Math.round(fleetUtilization * 100) / 100,
  };
}
