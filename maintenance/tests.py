from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from vehicles.models import Vehicle, VehicleStatus

from .models import MaintenanceLog, MaintenanceStatus

User = get_user_model()


def make_user(role, username="user"):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password="x")
    user.role = role
    user.save()
    return user


class MaintenanceAPITests(APITestCase):
    def setUp(self):
        self.fleet_manager = make_user("FLEET_MANAGER", "fm")
        self.client.force_authenticate(user=self.fleet_manager)

    def test_open_maintenance_puts_vehicle_in_shop(self):
        vehicle = Vehicle.objects.create(
            registration_number="V1", capacity=100, status=VehicleStatus.AVAILABLE
        )
        response = self.client.post(
            "/api/maintenance/", {"vehicle": vehicle.id, "reason": "Oil change", "cost": "50.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.status, VehicleStatus.IN_SHOP)

    def test_open_maintenance_blocked_mid_trip(self):
        vehicle = Vehicle.objects.create(
            registration_number="V2", capacity=100, status=VehicleStatus.ON_TRIP
        )
        response = self.client.post(
            "/api/maintenance/", {"vehicle": vehicle.id, "reason": "Brakes", "cost": "10.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_second_open_maintenance_blocked_while_one_already_open(self):
        # Regression test: without this guard, two concurrent OPEN logs could
        # exist on one vehicle, and closing either one would incorrectly
        # release it to AVAILABLE while the other log is still open.
        vehicle = Vehicle.objects.create(
            registration_number="V6", capacity=100, status=VehicleStatus.AVAILABLE
        )
        first = self.client.post(
            "/api/maintenance/", {"vehicle": vehicle.id, "reason": "Oil", "cost": "10.00"}
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            "/api/maintenance/", {"vehicle": vehicle.id, "reason": "Brakes", "cost": "20.00"}
        )
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(second.data["reason"], "maintenance_already_open")

    def test_close_restores_vehicle_to_available(self):
        vehicle = Vehicle.objects.create(
            registration_number="V3", capacity=100, status=VehicleStatus.IN_SHOP
        )
        log = MaintenanceLog.objects.create(vehicle=vehicle, reason="Tires", cost="30.00")
        response = self.client.post(f"/api/maintenance/{log.id}/close/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.status, VehicleStatus.AVAILABLE)
        log.refresh_from_db()
        self.assertEqual(log.status, MaintenanceStatus.CLOSED)
        self.assertIsNotNone(log.closed_at)

    def test_double_close_is_conflict(self):
        vehicle = Vehicle.objects.create(registration_number="V4", capacity=100)
        log = MaintenanceLog.objects.create(
            vehicle=vehicle, reason="Tires", cost="0", status=MaintenanceStatus.CLOSED
        )
        response = self.client.post(f"/api/maintenance/{log.id}/close/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_close_does_not_clobber_retired_vehicle(self):
        # Regression test for the exact clobber bug flagged in TASKS.md: a vehicle
        # retired while its maintenance log is still open must not bounce back to
        # AVAILABLE when that log is later closed.
        vehicle = Vehicle.objects.create(
            registration_number="V5", capacity=100, status=VehicleStatus.RETIRED
        )
        log = MaintenanceLog.objects.create(vehicle=vehicle, reason="Retire prep", cost="0")
        response = self.client.post(f"/api/maintenance/{log.id}/close/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.status, VehicleStatus.RETIRED)
