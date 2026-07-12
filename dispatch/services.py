import os
import time

from django.db import transaction
from django.utils import timezone

from drivers.models import Driver, DriverStatus
from trips.models import Trip, TripStatus
from vehicles.models import Vehicle, VehicleStatus


class ConflictError(Exception):
    def __init__(self, reason):
        self.reason = reason
        self.code = reason
        super().__init__(reason)


def _debug_delay():
    """
    Demo-only forcing mechanism (council fix): widens the race window between
    acquiring the row locks and committing, so two near-simultaneous requests
    genuinely overlap instead of resolving sequentially at the HTTP level.
    Off unless DISPATCH_DEBUG_DELAY_MS is explicitly set — never set in tests
    or normal operation.
    """
    delay_ms = os.environ.get("DISPATCH_DEBUG_DELAY_MS")
    if delay_ms:
        time.sleep(int(delay_ms) / 1000)


def dispatch_trip(trip_id: str) -> dict:
    """Returns {"success": True} or raises ConflictError(reason)."""
    with transaction.atomic():
        trip = Trip.objects.select_related("vehicle", "driver").get(id=trip_id)
        vehicle = Vehicle.objects.select_for_update().get(id=trip.vehicle_id)
        driver = Driver.objects.select_for_update().get(id=trip.driver_id)

        _debug_delay()

        if trip.status != TripStatus.DRAFT:
            raise ConflictError("trip_not_draft")
        if vehicle.status != VehicleStatus.AVAILABLE:
            raise ConflictError("vehicle_unavailable")
        if driver.status != DriverStatus.AVAILABLE:
            raise ConflictError("driver_unavailable")
        if driver.license_expiry and driver.license_expiry < timezone.now().date():
            raise ConflictError("license_expired")
        if trip.cargo_weight > vehicle.capacity:
            raise ConflictError("cargo_exceeds_capacity")

        vehicle.status = VehicleStatus.ON_TRIP
        vehicle.save(update_fields=["status"])
        driver.status = DriverStatus.ON_TRIP
        driver.save(update_fields=["status"])
        trip.status = TripStatus.DISPATCHED
        trip.dispatched_at = timezone.now()
        trip.save(update_fields=["status", "dispatched_at"])

        return {"success": True}
