import { useEffect, useState } from "react";
import * as fuelExpensesApi from "../api/fuelExpenses";
import * as vehiclesApi from "../api/vehicles";
import * as tripsApi from "../api/trips";
import { downloadReportCsv } from "../api/reports";
import FuelLogForm from "../components/FuelLogForm";
import ExpenseForm from "../components/ExpenseForm";

export default function FuelExpensesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fuelFormOpen, setFuelFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([vehiclesApi.listVehicles(), tripsApi.listTrips()]).then(([v, t]) => {
      setVehicles(v);
      setTrips(t);
      setRefsLoaded(true);
    });
    load();
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([
      fuelExpensesApi.listFuelLogs(),
      fuelExpensesApi.listExpenses(),
      fuelExpensesApi.getOperationalCosts(),
    ])
      .then(([f, e, c]) => {
        setFuelLogs(f);
        setExpenses(e);
        setCosts(c);
      })
      .catch(() => setError("Failed to load fuel/expense data."))
      .finally(() => setLoading(false));
  }

  function vehicleLabel(id) {
    const v = vehicles.find((v) => v.id === id);
    return v ? v.registration_number : id ? `#${id}` : "—";
  }

  async function handleCreateFuelLog(values) {
    setSubmitting(true);
    setError(null);
    try {
      await fuelExpensesApi.createFuelLog(values);
      setFuelFormOpen(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to log fuel.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateExpense(values) {
    setSubmitting(true);
    setError(null);
    try {
      await fuelExpensesApi.createExpense(values);
      setExpenseFormOpen(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Fuel & Expenses</h1>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => downloadReportCsv("fuel")}>
            Export Fuel CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            onClick={() => downloadReportCsv("expenses")}
          >
            Export Expenses CSV
          </button>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            onClick={() => setFuelFormOpen(true)}
            disabled={!refsLoaded}
            title={refsLoaded ? undefined : "Loading vehicles…"}
          >
            + Fuel Log
          </button>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            onClick={() => setExpenseFormOpen(true)}
            disabled={!refsLoaded}
            title={refsLoaded ? undefined : "Loading vehicles and trips…"}
          >
            + Expense
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {fuelFormOpen && (
        <FuelLogForm
          vehicles={vehicles}
          onSubmit={handleCreateFuelLog}
          onCancel={() => setFuelFormOpen(false)}
          submitting={submitting}
        />
      )}
      {expenseFormOpen && (
        <ExpenseForm
          vehicles={vehicles}
          trips={trips}
          onSubmit={handleCreateExpense}
          onCancel={() => setExpenseFormOpen(false)}
          submitting={submitting}
        />
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <h2>Operational Cost per Vehicle</h2>
          <p className="section-note">Fuel + Maintenance, computed live from logs below.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Fuel Cost</th>
                  <th>Maintenance Cost</th>
                  <th>Operational Cost</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.vehicle_id}>
                    <td>{c.registration_number}</td>
                    <td>{c.fuel_cost.toFixed(2)}</td>
                    <td>{c.maintenance_cost.toFixed(2)}</td>
                    <td>
                      <strong>{c.operational_cost.toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Fuel Logs</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Liters</th>
                  <th>Cost</th>
                  <th>Odometer</th>
                  <th>Logged</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((f) => (
                  <tr key={f.id}>
                    <td>{vehicleLabel(f.vehicle)}</td>
                    <td>{f.liters}</td>
                    <td>{f.cost}</td>
                    <td>{f.odometer_at_fill}</td>
                    <td>{new Date(f.logged_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Expenses</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Vehicle</th>
                  <th>Trip</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.category}</td>
                    <td>{e.amount}</td>
                    <td>{vehicleLabel(e.vehicle)}</td>
                    <td>{e.trip ? `#${e.trip}` : "—"}</td>
                    <td>{new Date(e.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
