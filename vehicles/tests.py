from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Vehicle, VehicleStatus

User = get_user_model()


def make_user(role, username="user"):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password="x")
    user.role = role
    user.save()
    return user


class VehicleAPITests(APITestCase):
    def setUp(self):
        self.fleet_manager = make_user("FLEET_MANAGER", "fm")
        self.driver = make_user("DRIVER", "drv")

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def test_requires_authentication(self):
        response = self.client.get("/api/vehicles/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_fleet_manager_forbidden(self):
        self.auth_as(self.driver)
        response = self.client.get("/api/vehicles/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_and_duplicate_registration(self):
        self.auth_as(self.fleet_manager)
        payload = {
            "registration_number": "VAN-05",
            "model": "Tata Ace",
            "type": "VAN",
            "capacity": 500,
            "odometer": 0,
            "acquisition_cost": "15000.00",
            "region": "North",
        }
        response = self.client.post("/api/vehicles/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], VehicleStatus.AVAILABLE)

        duplicate = self.client.post("/api/vehicles/", payload)
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_type(self):
        self.auth_as(self.fleet_manager)
        Vehicle.objects.create(registration_number="A1", type="VAN", capacity=100)
        Vehicle.objects.create(registration_number="A2", type="TRUCK", capacity=100)
        response = self.client.get("/api/vehicles/?type=VAN")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["registration_number"], "A1")

    def test_retire_blocked_while_on_trip(self):
        self.auth_as(self.fleet_manager)
        vehicle = Vehicle.objects.create(
            registration_number="B1", capacity=100, status=VehicleStatus.ON_TRIP
        )
        response = self.client.patch(f"/api/vehicles/{vehicle.id}/retire/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["reason"], "vehicle_on_trip")

    def test_retire_succeeds_when_not_on_trip(self):
        self.auth_as(self.fleet_manager)
        vehicle = Vehicle.objects.create(
            registration_number="B2", capacity=100, status=VehicleStatus.AVAILABLE
        )
        response = self.client.patch(f"/api/vehicles/{vehicle.id}/retire/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.status, VehicleStatus.RETIRED)

    def test_delete_blocked_while_on_trip(self):
        self.auth_as(self.fleet_manager)
        vehicle = Vehicle.objects.create(
            registration_number="C1", capacity=100, status=VehicleStatus.ON_TRIP
        )
        response = self.client.delete(f"/api/vehicles/{vehicle.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_delete_succeeds_when_not_on_trip(self):
        self.auth_as(self.fleet_manager)
        vehicle = Vehicle.objects.create(
            registration_number="C2", capacity=100, status=VehicleStatus.AVAILABLE
        )
        response = self.client.delete(f"/api/vehicles/{vehicle.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_with_linked_trip_returns_409_not_500(self):
        # Regression test: Trip.vehicle is on_delete=PROTECT, so deleting a
        # vehicle referenced by any trip (even a harmless DRAFT) used to crash
        # with an unhandled ProtectedError (500) instead of a clean response.
        from drivers.models import Driver
        from trips.models import Trip

        vehicle = Vehicle.objects.create(registration_number="D1", capacity=100)
        driver = Driver.objects.create(name="X", license_expiry="2030-01-01")
        Trip.objects.create(vehicle=vehicle, driver=driver, cargo_weight=1, origin="A", destination="B")

        self.auth_as(self.fleet_manager)
        response = self.client.delete(f"/api/vehicles/{vehicle.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["reason"], "vehicle_has_trips")
