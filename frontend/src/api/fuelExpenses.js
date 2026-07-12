import { apiFetch, USE_MOCKS, mockDelay } from "./client";
import { mockFuelLogs, mockExpenses, mockVehicles, mockMaintenanceLogs } from "./mockData";
import { bucketAmountsByWeek } from "../utils/dateBuckets";

export const EXPENSE_TREND_CATEGORIES = ["FUEL", "MAINTENANCE", "TOLL", "OPERATIONAL"];

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export async function listFuelLogs(params = {}) {
  if (USE_MOCKS) {
    const results = mockFuelLogs.filter((f) => {
      if (params.vehicle && f.vehicle !== Number(params.vehicle)) return false;
      return true;
    });
    return mockDelay(results);
  }
  return apiFetch("/fuel-logs/", { params });
}

export async function createFuelLog(data) {
  if (USE_MOCKS) {
    const log = {
      id: nextId(mockFuelLogs),
      logged_at: new Date().toISOString(),
      ...data,
      liters: String(data.liters),
      cost: String(data.cost),
    };
    mockFuelLogs.push(log);
    return mockDelay(log);
  }
  return apiFetch("/fuel-logs/", { method: "POST", body: data });
}

export async function listExpenses(params = {}) {
  if (USE_MOCKS) {
    const results = mockExpenses.filter((e) => {
      if (params.category && e.category !== params.category) return false;
      if (params.vehicle && e.vehicle !== Number(params.vehicle)) return false;
      return true;
    });
    return mockDelay(results);
  }
  return apiFetch("/expenses/", { params });
}

export async function createExpense(data) {
  if (USE_MOCKS) {
    const expense = {
      id: nextId(mockExpenses),
      date: new Date().toISOString(),
      ...data,
      amount: String(data.amount),
    };
    mockExpenses.push(expense);
    return mockDelay(expense);
  }
  return apiFetch("/expenses/", { method: "POST", body: data });
}

// PRD 3.7: "Automatically compute total operational cost (Fuel + Maintenance) per vehicle."
// Mock-only aggregation — real backend presumably exposes this via /api/reports/ or annotates
// the vehicle serializer; not specified in TASKS.md's API surface, so this is a Dev C addition
// to satisfy the PRD requirement directly in the UI.
export async function getOperationalCosts() {
  if (USE_MOCKS) {
    const costs = mockVehicles.map((vehicle) => {
      const fuelCost = mockFuelLogs
        .filter((f) => f.vehicle === vehicle.id)
        .reduce((sum, f) => sum + Number(f.cost), 0);
      const maintenanceCost = mockMaintenanceLogs
        .filter((m) => m.vehicle === vehicle.id)
        .reduce((sum, m) => sum + Number(m.cost), 0);
      return {
        vehicle_id: vehicle.id,
        registration_number: vehicle.registration_number,
        fuel_cost: fuelCost,
        maintenance_cost: maintenanceCost,
        operational_cost: fuelCost + maintenanceCost,
      };
    });
    return mockDelay(costs);
  }
  return apiFetch("/reports/operational-costs/");
}

// Weekly Fuel/Maintenance/Toll/Operational spend trend for the Fleet Manager and
// Financial Analyst dashboards. "Fuel" is FuelLog.cost (the actual fill-up ledger);
// the other three categories come from Expense.category — kept as two separate
// sources rather than merged, matching how the rest of the app already treats fuel
// logging and general expense logging as distinct flows (separate forms, separate
// tables on the Fuel & Expenses page).
export async function getExpenseTrend(weeksBack = 8) {
  if (USE_MOCKS) {
    const fuelRecords = mockFuelLogs.map((f) => ({
      date: f.logged_at,
      category: "FUEL",
      amount: Number(f.cost),
    }));
    const expenseRecords = mockExpenses.map((e) => ({
      date: e.date,
      category: e.category,
      amount: Number(e.amount),
    }));
    return mockDelay(bucketAmountsByWeek([...fuelRecords, ...expenseRecords], EXPENSE_TREND_CATEGORIES, weeksBack));
  }
  const [fuelLogs, expenses] = await Promise.all([listFuelLogs(), listExpenses()]);
  const fuelRecords = fuelLogs.map((f) => ({ date: f.logged_at, category: "FUEL", amount: Number(f.cost) }));
  const expenseRecords = expenses.map((e) => ({ date: e.date, category: e.category, amount: Number(e.amount) }));
  return bucketAmountsByWeek([...fuelRecords, ...expenseRecords], EXPENSE_TREND_CATEGORIES, weeksBack);
}
