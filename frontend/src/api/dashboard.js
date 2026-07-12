import { apiFetch, USE_MOCKS, mockDelay } from "./client";
import { mockVehicles, mockTrips, mockDrivers } from "./mockData";
import { listVehicles } from "./vehicles";
import { VEHICLE_STATUSES } from "../constants";

// Filters (type/status/region) narrow the Vehicle queryset used for the vehicle-derived KPIs
// (Active/Available/Maintenance Vehicles, Fleet Utilization). Trip- and driver-derived KPIs
// (Active/Pending Trips, Drivers On Duty) stay global since those filters are vehicle attributes.
// This is Dev C's interpretation, not an explicit rule in TASKS.md — worth confirming against
// Dev A's real /api/dashboard/kpis/ semantics once it's live.
export async function getKpis(params = {}) {
  if (USE_MOCKS) {
    const vehicles = mockVehicles.filter((v) => {
      if (params.type && v.type !== params.type) return false;
      if (params.status && v.status !== params.status) return false;
      if (params.region && v.region !== params.region) return false;
      return true;
    });

    const activeVehicles = vehicles.filter((v) => v.status === "ON_TRIP").length;
    const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE").length;
    const vehiclesInMaintenance = vehicles.filter((v) => v.status === "IN_SHOP").length;
    const nonRetired = vehicles.filter((v) => v.status !== "RETIRED").length;
    const fleetUtilization = nonRetired > 0 ? (activeVehicles / nonRetired) * 100 : 0;

    return mockDelay({
      active_vehicles: activeVehicles,
      available_vehicles: availableVehicles,
      vehicles_in_maintenance: vehiclesInMaintenance,
      active_trips: mockTrips.filter((t) => t.status === "DISPATCHED").length,
      pending_trips: mockTrips.filter((t) => t.status === "DRAFT").length,
      drivers_on_duty: mockDrivers.filter((d) => d.status === "ON_TRIP").length,
      fleet_utilization: Math.round(fleetUtilization * 100) / 100,
    });
  }
  return apiFetch("/dashboard/kpis/", { params });
}

// Not one of TASKS.md's six KPI formulas — a Dev C addition for the status bar chart.
// Built on GET /api/vehicles/, which is in the real contract either way, so this keeps
// working whether USE_MOCKS is on or off (unlike leaning on an extra kpis.* field that
// Dev A's real endpoint has no obligation to return).
export async function getVehicleStatusBreakdown(params = {}) {
  const vehicles = await listVehicles(params);
  return VEHICLE_STATUSES.map((status) => ({
    status,
    count: vehicles.filter((v) => v.status === status).length,
  }));
}
