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


def dispatch_trip(trip_id: str) -> dict:
    """Returns {"success": True} or raises ConflictError(reason)."""
    with transaction.atomic():
        trip = Trip.objects.select_related("vehicle", "driver").get(id=trip_id)
        vehicle = Vehicle.objects.select_for_update().get(id=trip.vehicle_id)
        driver = Driver.objects.select_for_update().get(id=trip.driver_id)

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
