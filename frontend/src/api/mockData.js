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
  // driver_id links this login to a Driver record (mockDrivers id 1, "Alex Menon") so
  // "driver can only act on their own trip" scoping has something real to check against.
  { id: 2, username: "driver_alex", email: "driver@transitops.test", password: "password123", role: ROLES.DRIVER, driver_id: 1 },
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
  { id: 1, name: "Alex Menon", license: "KL-05-2020-0011234", license_category: "LMV", license_expiry: "2027-05-01", contact: "9876543210", safety_score: 92, status: "AVAILABLE", created_at: "2026-01-10T09:00:00Z" },
  { id: 2, name: "Priya Nair", license: "KL-07-2019-0089213", license_category: "HMV", license_expiry: "2026-03-01", contact: "9876500011", safety_score: 88, status: "ON_TRIP", created_at: "2026-01-11T09:00:00Z" },
  { id: 3, name: "Ravi Kumar", license: "KL-01-2018-0034521", license_category: "HMV", license_expiry: "2026-08-15", contact: "9876511122", safety_score: 65, status: "SUSPENDED", created_at: "2026-01-12T09:00:00Z" },
  { id: 4, name: "Sneha Thomas", license: "KL-09-2021-0091823", license_category: "LMV", license_expiry: "2026-01-01", contact: "9876522233", safety_score: 78, status: "OFF_DUTY", created_at: "2026-01-13T09:00:00Z" },
];

// distance_km: PRD 3.5 lists "planned distance" as a trip field that TASKS.md's
// reference schema omits entirely — added per the "PRD is final" rule, flagged to
// Dev B that the real Trip model needs it too. Approximate real road distances from
// Kochi for each destination, not arbitrary numbers.
export const mockTrips = [
  { id: 1, vehicle: 2, driver: 2, cargo_weight: 1200, origin: "Kochi", destination: "Coimbatore", distance_km: 190, status: "DISPATCHED", dispatched_at: "2026-07-12T08:00:00Z", completed_at: null, created_at: "2026-07-12T07:30:00Z" },
  // Driver 1 (Alex Menon, linked to the driver_alex login) has a pending Draft trip
  // assigned to them — this is the "trip request" the driver dashboard pops up on load.
  { id: 2, vehicle: 1, driver: 1, cargo_weight: 450, origin: "Kochi", destination: "Thrissur", distance_km: 80, status: "DRAFT", dispatched_at: null, completed_at: null, created_at: "2026-07-12T09:00:00Z" },
  // Historical trips for driver 1, spread across the past ~8 weeks, so the driver
  // dashboard's trip-history chart has real data to show instead of 1-2 sparse points.
  { id: 3, vehicle: 1, driver: 1, cargo_weight: 300, origin: "Kochi", destination: "Alappuzha", distance_km: 55, status: "COMPLETED", dispatched_at: "2026-05-20T08:00:00Z", completed_at: "2026-05-20T13:30:00Z", created_at: "2026-05-20T07:30:00Z" },
  { id: 4, vehicle: 1, driver: 1, cargo_weight: 480, origin: "Kochi", destination: "Munnar", distance_km: 130, status: "COMPLETED", dispatched_at: "2026-05-27T08:00:00Z", completed_at: "2026-05-27T15:00:00Z", created_at: "2026-05-27T07:30:00Z" },
  { id: 5, vehicle: 1, driver: 1, cargo_weight: 200, origin: "Kochi", destination: "Kottayam", distance_km: 60, status: "COMPLETED", dispatched_at: "2026-06-02T08:00:00Z", completed_at: "2026-06-02T12:15:00Z", created_at: "2026-06-02T07:30:00Z" },
  { id: 6, vehicle: 1, driver: 1, cargo_weight: 350, origin: "Kochi", destination: "Thrissur", distance_km: 80, status: "COMPLETED", dispatched_at: "2026-06-09T08:00:00Z", completed_at: "2026-06-09T13:00:00Z", created_at: "2026-06-09T07:30:00Z" },
  { id: 7, vehicle: 1, driver: 1, cargo_weight: 420, origin: "Kochi", destination: "Palakkad", distance_km: 130, status: "CANCELLED", dispatched_at: "2026-06-14T08:00:00Z", completed_at: "2026-06-14T09:10:00Z", created_at: "2026-06-14T07:30:00Z" },
  { id: 8, vehicle: 1, driver: 1, cargo_weight: 500, origin: "Kochi", destination: "Kannur", distance_km: 285, status: "COMPLETED", dispatched_at: "2026-06-21T08:00:00Z", completed_at: "2026-06-21T17:00:00Z", created_at: "2026-06-21T07:30:00Z" },
  { id: 9, vehicle: 1, driver: 1, cargo_weight: 150, origin: "Kochi", destination: "Alappuzha", distance_km: 55, status: "COMPLETED", dispatched_at: "2026-06-28T08:00:00Z", completed_at: "2026-06-28T12:00:00Z", created_at: "2026-06-28T07:30:00Z" },
  { id: 10, vehicle: 1, driver: 1, cargo_weight: 400, origin: "Kochi", destination: "Idukki", distance_km: 120, status: "COMPLETED", dispatched_at: "2026-07-05T08:00:00Z", completed_at: "2026-07-05T16:00:00Z", created_at: "2026-07-05T07:30:00Z" },
  { id: 11, vehicle: 1, driver: 1, cargo_weight: 300, origin: "Kochi", destination: "Ernakulam", distance_km: 8, status: "COMPLETED", dispatched_at: "2026-07-10T08:00:00Z", completed_at: "2026-07-10T11:30:00Z", created_at: "2026-07-10T07:30:00Z" },
];

export const mockMaintenanceLogs = [
  { id: 1, vehicle: 3, reason: "Oil change + brake inspection", cost: "4500.00", status: "OPEN", started_at: "2026-07-11T10:00:00Z", closed_at: null },
];

// Fuel & Expense history spread across the past ~8 weeks (matching the driver trip
// history's date range) so the Fuel/Expense trend chart has a real multi-week,
// multi-category trend instead of 1-2 sparse points.
export const mockFuelLogs = [
  { id: 1, vehicle: 2, liters: "60.00", cost: "5400.00", odometer_at_fill: 43000, logged_at: "2026-05-18T09:00:00Z" },
  { id: 2, vehicle: 1, liters: "30.00", cost: "2700.00", odometer_at_fill: 11800, logged_at: "2026-05-25T09:00:00Z" },
  { id: 3, vehicle: 3, liters: "25.00", cost: "2250.00", odometer_at_fill: 8000, logged_at: "2026-06-01T09:00:00Z" },
  { id: 4, vehicle: 2, liters: "55.00", cost: "4950.00", odometer_at_fill: 43800, logged_at: "2026-06-08T09:00:00Z" },
  { id: 5, vehicle: 1, liters: "32.00", cost: "2900.00", odometer_at_fill: 12000, logged_at: "2026-06-15T09:00:00Z" },
  { id: 6, vehicle: 3, liters: "28.00", cost: "2500.00", odometer_at_fill: 8200, logged_at: "2026-06-22T09:00:00Z" },
  { id: 7, vehicle: 2, liters: "58.00", cost: "5200.00", odometer_at_fill: 44500, logged_at: "2026-06-29T09:00:00Z" },
  { id: 8, vehicle: 1, liters: "33.00", cost: "3000.00", odometer_at_fill: 12200, logged_at: "2026-07-06T09:00:00Z" },
  { id: 9, vehicle: 1, liters: "35.50", cost: "3200.00", odometer_at_fill: 12400, logged_at: "2026-07-10T08:00:00Z" },
];

export const mockExpenses = [
  { id: 1, vehicle: 1, trip: null, category: "TOLL", amount: "200.00", date: "2026-05-20T09:00:00Z" },
  { id: 2, vehicle: 2, trip: null, category: "OPERATIONAL", amount: "800.00", date: "2026-05-27T09:00:00Z" },
  { id: 3, vehicle: 1, trip: null, category: "MAINTENANCE", amount: "1200.00", date: "2026-06-02T09:00:00Z" },
  { id: 4, vehicle: 3, trip: null, category: "TOLL", amount: "150.00", date: "2026-06-09T09:00:00Z" },
  { id: 5, vehicle: 2, trip: null, category: "OPERATIONAL", amount: "950.00", date: "2026-06-16T09:00:00Z" },
  { id: 6, vehicle: 1, trip: null, category: "MAINTENANCE", amount: "1600.00", date: "2026-06-23T09:00:00Z" },
  { id: 7, vehicle: 3, trip: null, category: "TOLL", amount: "180.00", date: "2026-06-30T09:00:00Z" },
  { id: 8, vehicle: 2, trip: null, category: "OPERATIONAL", amount: "700.00", date: "2026-07-07T09:00:00Z" },
  { id: 9, vehicle: 2, trip: 1, category: "TOLL", amount: "450.00", date: "2026-07-12T08:10:00Z" },
  { id: 10, vehicle: 3, trip: null, category: "MAINTENANCE", amount: "4500.00", date: "2026-07-11T10:00:00Z" },
];

