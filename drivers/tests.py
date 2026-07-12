import datetime

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Driver, DriverStatus
from .utils import is_license_expired

User = get_user_model()


def make_user(role, username="user"):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password="x")
    user.role = role
    user.save()
    return user


class IsLicenseExpiredTests(APITestCase):
    def test_past_date_is_expired(self):
        driver = Driver(license_expiry=timezone.now().date() - datetime.timedelta(days=1))
        self.assertTrue(is_license_expired(driver))

    def test_future_date_is_not_expired(self):
        driver = Driver(license_expiry=timezone.now().date() + datetime.timedelta(days=1))
        self.assertFalse(is_license_expired(driver))

    def test_unset_date_is_treated_as_expired(self):
        driver = Driver(license_expiry=None)
        self.assertTrue(is_license_expired(driver))


class DriverAPITests(APITestCase):
    def setUp(self):
        self.fleet_manager = make_user("FLEET_MANAGER", "fm")
        self.safety_officer = make_user("SAFETY_OFFICER", "so")
        self.driver_role = make_user("DRIVER", "drv")

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def test_requires_authentication(self):
        response = self.client.get("/api/drivers/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_fleet_manager_can_create(self):
        self.auth_as(self.fleet_manager)
        response = self.client.post(
            "/api/drivers/",
            {"name": "Alex", "license": "DL1", "license_expiry": "2030-01-01"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], DriverStatus.AVAILABLE)

    def test_safety_officer_read_only(self):
        Driver.objects.create(name="Alex", license_expiry="2030-01-01")
        self.auth_as(self.safety_officer)
        list_response = self.client.get("/api/drivers/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post("/api/drivers/", {"name": "Blocked"})
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_driver_role_forbidden(self):
        self.auth_as(self.driver_role)
        response = self.client.get("/api/drivers/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_filter(self):
        Driver.objects.create(name="A", status=DriverStatus.AVAILABLE)
        Driver.objects.create(name="B", status=DriverStatus.SUSPENDED)
        self.auth_as(self.fleet_manager)
        response = self.client.get("/api/drivers/?status=SUSPENDED")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "B")

    def test_delete_blocked_while_on_trip(self):
        driver = Driver.objects.create(name="OnTrip", status=DriverStatus.ON_TRIP)
        self.auth_as(self.fleet_manager)
        response = self.client.delete(f"/api/drivers/{driver.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_delete_succeeds_when_not_on_trip(self):
        driver = Driver.objects.create(name="Free", status=DriverStatus.AVAILABLE)
        self.auth_as(self.fleet_manager)
        response = self.client.delete(f"/api/drivers/{driver.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_with_linked_trip_returns_409_not_500(self):
        # Regression test: Trip.driver is on_delete=PROTECT, same crash risk
        # as the vehicles side.
        from trips.models import Trip
        from vehicles.models import Vehicle

        driver = Driver.objects.create(name="Y", license_expiry="2030-01-01")
        vehicle = Vehicle.objects.create(registration_number="D2", capacity=100)
        Trip.objects.create(vehicle=vehicle, driver=driver, cargo_weight=1, origin="A", destination="B")

        self.auth_as(self.fleet_manager)
        response = self.client.delete(f"/api/drivers/{driver.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["reason"], "driver_has_trips")
