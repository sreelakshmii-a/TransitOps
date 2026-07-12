import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from dispatch.services import dispatch_trip
from drivers.models import Driver, DriverStatus
from vehicles.models import Vehicle, VehicleStatus

from .models import Trip, TripStatus


class TripLifecycleTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        user = get_user_model().objects.create_user(username="tripuser")
        self.client.force_authenticate(user=user)
        self.vehicle = Vehicle.objects.create(
            registration_number="TEST-VEH-1", capacity=1000, status=VehicleStatus.AVAILABLE,
        )
        self.driver = Driver.objects.create(
            name="Test Driver",
            status=DriverStatus.AVAILABLE,
            license_expiry=timezone.now().date() + datetime.timedelta(days=365),
        )

    def _create_draft(self, cargo_weight=100):
        return self.client.post("/api/trips/", {
            "vehicle": self.vehicle.id, "driver": self.driver.id,
            "cargo_weight": cargo_weight, "origin": "A", "destination": "B",
        })

    def test_create_draft_within_capacity(self):
        response = self._create_draft(cargo_weight=500)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], TripStatus.DRAFT)

    def test_create_draft_over_capacity_rejected(self):
        response = self._create_draft(cargo_weight=5000)
        self.assertEqual(response.status_code, 400)

    def test_complete_a_draft_trip_is_conflict(self):
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DRAFT,
        )
        response = self.client.post(f"/api/trips/{trip.id}/complete/")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["reason"], "trip_not_dispatched")

    def test_cancel_a_draft_trip_is_conflict(self):
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DRAFT,
        )
        response = self.client.post(f"/api/trips/{trip.id}/cancel/")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["reason"], "trip_not_dispatched")

    def test_double_cancel_is_conflict(self):
        self.vehicle.status = VehicleStatus.ON_TRIP
        self.vehicle.save(update_fields=["status"])
        self.driver.status = DriverStatus.ON_TRIP
        self.driver.save(update_fields=["status"])
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DISPATCHED,
        )
        first = self.client.post(f"/api/trips/{trip.id}/cancel/")
        second = self.client.post(f"/api/trips/{trip.id}/cancel/")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(second.data["reason"], "trip_not_dispatched")

    def test_complete_releases_vehicle_and_driver(self):
        self.vehicle.status = VehicleStatus.ON_TRIP
        self.vehicle.save(update_fields=["status"])
        self.driver.status = DriverStatus.ON_TRIP
        self.driver.save(update_fields=["status"])
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DISPATCHED,
        )
        response = self.client.post(f"/api/trips/{trip.id}/complete/")
        self.assertEqual(response.status_code, 200)

        self.vehicle.refresh_from_db()
        self.driver.refresh_from_db()
        trip.refresh_from_db()
        self.assertEqual(self.vehicle.status, VehicleStatus.AVAILABLE)
        self.assertEqual(self.driver.status, DriverStatus.AVAILABLE)
        self.assertEqual(trip.status, TripStatus.COMPLETED)
        self.assertIsNotNone(trip.completed_at)

    def test_cancel_never_overwrites_vehicle_moved_to_in_shop_by_maintenance(self):
        """[council fix] Maintenance opening mid-trip must not get clobbered
        back to AVAILABLE when the trip is later cancelled/completed."""
        self.vehicle.status = VehicleStatus.ON_TRIP
        self.vehicle.save(update_fields=["status"])
        self.driver.status = DriverStatus.ON_TRIP
        self.driver.save(update_fields=["status"])
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DISPATCHED,
        )

        # Simulates Dev A's maintenance flow moving the vehicle mid-trip.
        self.vehicle.status = VehicleStatus.IN_SHOP
        self.vehicle.save(update_fields=["status"])

        response = self.client.post(f"/api/trips/{trip.id}/cancel/")
        self.assertEqual(response.status_code, 200)

        self.vehicle.refresh_from_db()
        trip.refresh_from_db()
        self.assertEqual(self.vehicle.status, VehicleStatus.IN_SHOP)
        self.assertEqual(trip.status, TripStatus.CANCELLED)

    def test_redispatching_completed_trip_is_rejected(self):
        """A completed trip's vehicle/driver are freed back to AVAILABLE;
        dispatch_trip must still refuse to re-dispatch a non-DRAFT trip."""
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.COMPLETED,
        )
        with self.assertRaises(Exception) as ctx:
            dispatch_trip(trip.id)
        self.assertEqual(ctx.exception.reason, "trip_not_draft")

    def test_dispatch_rejects_expired_license(self):
        self.driver.license_expiry = timezone.now().date() - datetime.timedelta(days=1)
        self.driver.save(update_fields=["license_expiry"])
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DRAFT,
        )
        response = self.client.post(f"/api/dispatch/{trip.id}/")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["reason"], "license_expired")

    def test_dispatch_rejects_retired_vehicle(self):
        self.vehicle.status = VehicleStatus.RETIRED
        self.vehicle.save(update_fields=["status"])
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DRAFT,
        )
        response = self.client.post(f"/api/dispatch/{trip.id}/")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["reason"], "vehicle_unavailable")

    def test_actions_on_nonexistent_trip_return_404_not_500(self):
        self.assertEqual(self.client.post("/api/dispatch/99999/").status_code, 404)
        self.assertEqual(self.client.post("/api/trips/99999/complete/").status_code, 404)
        self.assertEqual(self.client.post("/api/trips/99999/cancel/").status_code, 404)
