from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from dispatch.services import ConflictError
from drivers.models import Driver, DriverStatus
from vehicles.models import Vehicle, VehicleStatus

from .models import Trip, TripStatus


def _release_trip(trip_id: str, new_status: str) -> dict:
    """
    Shared by complete_trip/cancel_trip. Releases vehicle/driver back to
    AVAILABLE using a conditional filter(status=ON_TRIP).update(...), never
    a blind assignment — so this can never clobber a vehicle Maintenance
    has since moved to IN_SHOP (or a driver moved OFF_DUTY by some other
    flow) out from under a completing/cancelling trip.
    """
    with transaction.atomic():
        trip = get_object_or_404(Trip.objects.select_for_update(), id=trip_id)

        if trip.status != TripStatus.DISPATCHED:
            raise ConflictError("trip_not_dispatched")

        update_fields = {"status": new_status}
        if new_status == TripStatus.COMPLETED:
            update_fields["completed_at"] = timezone.now()
        Trip.objects.filter(id=trip_id).update(**update_fields)

        Vehicle.objects.filter(
            id=trip.vehicle_id, status=VehicleStatus.ON_TRIP
        ).update(status=VehicleStatus.AVAILABLE)
        Driver.objects.filter(
            id=trip.driver_id, status=DriverStatus.ON_TRIP
        ).update(status=DriverStatus.AVAILABLE)

        return {"success": True}


def complete_trip(trip_id: str) -> dict:
    return _release_trip(trip_id, TripStatus.COMPLETED)


def cancel_trip(trip_id: str) -> dict:
    return _release_trip(trip_id, TripStatus.CANCELLED)
