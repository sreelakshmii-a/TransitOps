from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from drivers.models import Driver, DriverStatus
from fuel_expenses.models import Expense, ExpenseCategory, FuelLog
from maintenance.models import MaintenanceLog
from trips.models import Trip, TripStatus
from vehicles.models import Vehicle, VehicleStatus

User = get_user_model()


class DashboardKpisTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", email="u@test.com", password="x", role="FLEET_MANAGER")
        self.client.force_authenticate(user=user)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/dashboard/kpis/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_kpi_formulas(self):
        Vehicle.objects.create(registration_number="A", capacity=1, status=VehicleStatus.ON_TRIP)
        Vehicle.objects.create(registration_number="B", capacity=1, status=VehicleStatus.AVAILABLE)
        Vehicle.objects.create(registration_number="C", capacity=1, status=VehicleStatus.IN_SHOP)
        Vehicle.objects.create(registration_number="D", capacity=1, status=VehicleStatus.RETIRED)
        Driver.objects.create(name="X", status=DriverStatus.ON_TRIP)
        v = Vehicle.objects.first()
        d = Driver.objects.first()
        Trip.objects.create(vehicle=v, driver=d, cargo_weight=1, origin="A", destination="B", status=TripStatus.DISPATCHED)
        Trip.objects.create(vehicle=v, driver=d, cargo_weight=1, origin="A", destination="B", status=TripStatus.DRAFT)

        response = self.client.get("/api/dashboard/kpis/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["active_vehicles"], 1)
        self.assertEqual(response.data["available_vehicles"], 1)
        self.assertEqual(response.data["vehicles_in_maintenance"], 1)
        self.assertEqual(response.data["active_trips"], 1)
        self.assertEqual(response.data["pending_trips"], 1)
        self.assertEqual(response.data["drivers_on_duty"], 1)
        # 1 ON_TRIP / 3 non-retired * 100
        self.assertAlmostEqual(response.data["fleet_utilization"], 33.33, places=2)

    def test_vehicle_filters_narrow_vehicle_kpis_only(self):
        Vehicle.objects.create(registration_number="V1", type="VAN", region="North", capacity=1, status=VehicleStatus.ON_TRIP)
        Vehicle.objects.create(registration_number="V2", type="TRUCK", region="South", capacity=1, status=VehicleStatus.ON_TRIP)
        response = self.client.get("/api/dashboard/kpis/?type=VAN")
        self.assertEqual(response.data["active_vehicles"], 1)

    def test_kpis_with_no_vehicles_returns_zeros(self):
        response = self.client.get("/api/dashboard/kpis/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["active_vehicles"], 0)
        self.assertEqual(response.data["fleet_utilization"], 0)

    def test_fleet_utilization_zero_when_only_retired_vehicles(self):
        Vehicle.objects.create(registration_number="R1", capacity=1, status=VehicleStatus.RETIRED)
        response = self.client.get("/api/dashboard/kpis/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["fleet_utilization"], 0)

    def test_status_and_region_filters_narrow_vehicle_kpis(self):
        Vehicle.objects.create(registration_number="N1", region="North", capacity=1, status=VehicleStatus.AVAILABLE)
        Vehicle.objects.create(registration_number="S1", region="South", capacity=1, status=VehicleStatus.AVAILABLE)
        response = self.client.get("/api/dashboard/kpis/?status=AVAILABLE&region=North")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["available_vehicles"], 1)


class OperationalCostsTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(username="u2", email="u2@test.com", password="x", role="FLEET_MANAGER")
        self.client.force_authenticate(user=user)

    def test_operational_cost_per_vehicle(self):
        vehicle = Vehicle.objects.create(registration_number="OC1", capacity=1)
        FuelLog.objects.create(vehicle=vehicle, liters=10, cost="100.00", odometer_at_fill=1)
        MaintenanceLog.objects.create(vehicle=vehicle, reason="X", cost="50.00")

        response = self.client.get("/api/reports/operational-costs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(r for r in response.data if r["vehicle_id"] == vehicle.id)
        self.assertEqual(row["fuel_cost"], 100.0)
        self.assertEqual(row["maintenance_cost"], 50.0)
        self.assertEqual(row["operational_cost"], 150.0)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/reports/operational-costs/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vehicle_with_no_logs_returns_zero_costs(self):
        vehicle = Vehicle.objects.create(registration_number="OC2", capacity=1)
        response = self.client.get("/api/reports/operational-costs/")
        row = next(r for r in response.data if r["vehicle_id"] == vehicle.id)
        self.assertEqual(row["fuel_cost"], 0.0)
        self.assertEqual(row["maintenance_cost"], 0.0)
        self.assertEqual(row["operational_cost"], 0.0)


class ReportsCsvTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(username="u3", email="u3@test.com", password="x", role="FLEET_MANAGER")
        self.client.force_authenticate(user=user)

    def test_csv_export_trips(self):
        vehicle = Vehicle.objects.create(registration_number="CSV1", capacity=1)
        driver = Driver.objects.create(name="CsvDriver")
        Trip.objects.create(vehicle=vehicle, driver=driver, cargo_weight=1, origin="A", destination="B")

        response = self.client.get("/api/reports/csv/?type=trips")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        content = response.content.decode()
        self.assertIn("CSV1", content)
        self.assertIn("CsvDriver", content)

    def test_csv_export_invalid_type(self):
        response = self.client.get("/api/reports/csv/?type=bogus")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_csv_export_missing_type_returns_400(self):
        response = self.client.get("/api/reports/csv/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_csv_export_fuel(self):
        vehicle = Vehicle.objects.create(registration_number="CSV2", capacity=1)
        FuelLog.objects.create(vehicle=vehicle, liters=10, cost="40.00", odometer_at_fill=100)
        response = self.client.get("/api/reports/csv/?type=fuel")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("CSV2", response.content.decode())

    def test_csv_export_expenses_handles_null_vehicle(self):
        Expense.objects.create(vehicle=None, category=ExpenseCategory.TOLL, amount="12.00")
        response = self.client.get("/api/reports/csv/?type=expenses")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("TOLL", response.content.decode())

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/reports/csv/?type=trips")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
