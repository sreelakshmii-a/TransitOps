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
        self.safety_officer = make_user("SAFETY_OFFICER", "so")
        self.financial_analyst = make_user("FINANCIAL_ANALYST", "fa")

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def test_requires_authentication(self):
        response = self.client.get("/api/vehicles/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_driver_can_read_but_not_write(self):
        # Driver needs read access to populate the Trips page's vehicle
        # dropdown (PRD 3.2: Driver "creates trips, assigns vehicles and
        # drivers"), but stays blocked from all vehicle write actions.
        self.auth_as(self.driver)
        list_response = self.client.get("/api/vehicles/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post("/api/vehicles/", {"registration_number": "X"})
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_safety_officer_forbidden(self):
        self.auth_as(self.safety_officer)
        response = self.client.get("/api/vehicles/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_financial_analyst_forbidden(self):
        self.auth_as(self.financial_analyst)
        response = self.client.get("/api/vehicles/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_required_fields_rejected(self):
        self.auth_as(self.fleet_manager)
        response = self.client.post("/api/vehicles/", {"model": "No Reg Number"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
