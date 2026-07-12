from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from vehicles.models import Vehicle

from .models import Expense, ExpenseCategory, FuelLog

User = get_user_model()


def make_user(role, username="user"):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password="x")
    user.role = role
    user.save()
    return user


class FuelExpensesAPITests(APITestCase):
    def setUp(self):
        self.fleet_manager = make_user("FLEET_MANAGER", "fm")
        self.financial_analyst = make_user("FINANCIAL_ANALYST", "fa")
        self.driver_role = make_user("DRIVER", "drv")
        self.vehicle = Vehicle.objects.create(registration_number="V1", capacity=100)

    def test_fleet_manager_can_create_fuel_log(self):
        self.client.force_authenticate(user=self.fleet_manager)
        response = self.client.post(
            "/api/fuel-logs/",
            {"vehicle": self.vehicle.id, "liters": "40.5", "cost": "65.00", "odometer_at_fill": 1200},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_financial_analyst_read_only(self):
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=15, odometer_at_fill=1)
        self.client.force_authenticate(user=self.financial_analyst)

        list_response = self.client.get("/api/fuel-logs/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            "/api/fuel-logs/",
            {"vehicle": self.vehicle.id, "liters": "1", "cost": "1", "odometer_at_fill": 1},
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_driver_role_forbidden(self):
        self.client.force_authenticate(user=self.driver_role)
        response = self.client.get("/api/fuel-logs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_expense_category_filter(self):
        Expense.objects.create(vehicle=self.vehicle, category=ExpenseCategory.TOLL, amount=15)
        Expense.objects.create(vehicle=self.vehicle, category=ExpenseCategory.FUEL, amount=20)
        self.client.force_authenticate(user=self.financial_analyst)
        response = self.client.get("/api/expenses/?category=TOLL")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], ExpenseCategory.TOLL)

    def test_requires_authentication(self):
        response = self.client.get("/api/fuel-logs/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_financial_analyst_cannot_create_expense(self):
        self.client.force_authenticate(user=self.financial_analyst)
        response = self.client.post(
            "/api/expenses/", {"vehicle": self.vehicle.id, "category": ExpenseCategory.TOLL, "amount": "5.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_fleet_manager_can_create_expense(self):
        self.client.force_authenticate(user=self.fleet_manager)
        response = self.client.post(
            "/api/expenses/", {"vehicle": self.vehicle.id, "category": ExpenseCategory.OPERATIONAL, "amount": "22.50"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_expense_allows_null_vehicle_and_trip(self):
        self.client.force_authenticate(user=self.fleet_manager)
        response = self.client.post(
            "/api/expenses/", {"category": ExpenseCategory.TOLL, "amount": "8.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["vehicle"])

    def test_fuel_log_missing_required_field_rejected(self):
        self.client.force_authenticate(user=self.fleet_manager)
        response = self.client.post(
            "/api/fuel-logs/", {"vehicle": self.vehicle.id, "cost": "10.00", "odometer_at_fill": 1}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expense_filter_by_vehicle(self):
        other_vehicle = Vehicle.objects.create(registration_number="V2", capacity=100)
        Expense.objects.create(vehicle=self.vehicle, category=ExpenseCategory.FUEL, amount=10)
        Expense.objects.create(vehicle=other_vehicle, category=ExpenseCategory.FUEL, amount=20)
        self.client.force_authenticate(user=self.fleet_manager)
        response = self.client.get(f"/api/expenses/?vehicle={self.vehicle.id}")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["amount"], "10.00")
