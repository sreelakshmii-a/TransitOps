import datetime
import threading

from django.db import connections
from django.test import TransactionTestCase
from django.utils import timezone

from drivers.models import Driver, DriverStatus
from trips.models import Trip
from vehicles.models import Vehicle, VehicleStatus

from trips.models import TripStatus
from trips.services import cancel_trip, complete_trip

from .services import ConflictError, dispatch_trip


class DispatchConcurrencyTest(TransactionTestCase):
    """
    Proves select_for_update() actually serializes concurrent dispatch
    attempts on the same vehicle/driver instead of racing. Must run against
    real Postgres (see transitops/settings.py TEST config) — SQLite silently
    no-ops select_for_update(), which would make this a false green.
    """

    def setUp(self):
        self.vehicle = Vehicle.objects.create(
            registration_number="CONC-1", capacity=1000, status=VehicleStatus.AVAILABLE,
        )
        self.driver = Driver.objects.create(
            name="Concurrency Driver",
            license_expiry=timezone.now().date() + datetime.timedelta(days=365),
            status=DriverStatus.AVAILABLE,
        )
        self.trip_a = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B",
        )
        self.trip_b = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B",
        )

    def test_concurrent_dispatch_only_one_succeeds(self):
        results = {}

        def run(trip_id, key):
            try:
                results[key] = ("success", dispatch_trip(trip_id))
            except ConflictError as exc:
                results[key] = ("conflict", exc.reason)
            finally:
                connections.close_all()

        t1 = threading.Thread(target=run, args=(self.trip_a.id, "a"))
        t2 = threading.Thread(target=run, args=(self.trip_b.id, "b"))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        outcomes = [results["a"][0], results["b"][0]]
        self.assertEqual(outcomes.count("success"), 1)
        self.assertEqual(outcomes.count("conflict"), 1)

        conflict_key = "a" if results["a"][0] == "conflict" else "b"
        self.assertEqual(results[conflict_key][1], "vehicle_unavailable")

        self.vehicle.refresh_from_db()
        self.driver.refresh_from_db()
        self.assertEqual(self.vehicle.status, VehicleStatus.ON_TRIP)
        self.assertEqual(self.driver.status, DriverStatus.ON_TRIP)


class CompleteCancelConcurrencyTest(TransactionTestCase):
    """Concurrent complete+cancel on the same DISPATCHED trip must not both
    succeed — the trip-row select_for_update() in trips/services.py should
    serialize these exactly like dispatch_trip does for vehicle/driver."""

    def setUp(self):
        self.vehicle = Vehicle.objects.create(
            registration_number="CONC-2", capacity=1000, status=VehicleStatus.ON_TRIP,
        )
        self.driver = Driver.objects.create(
            name="Concurrency Driver 2",
            license_expiry=timezone.now().date() + datetime.timedelta(days=365),
            status=DriverStatus.ON_TRIP,
        )
        self.trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, cargo_weight=100,
            origin="A", destination="B", status=TripStatus.DISPATCHED,
        )

    def test_concurrent_complete_and_cancel_only_one_succeeds(self):
        results = {}

        def run(fn, key):
            try:
                results[key] = ("success", fn(self.trip.id))
            except ConflictError as exc:
                results[key] = ("conflict", exc.reason)
            finally:
                connections.close_all()

        t1 = threading.Thread(target=run, args=(complete_trip, "complete"))
        t2 = threading.Thread(target=run, args=(cancel_trip, "cancel"))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        outcomes = [results["complete"][0], results["cancel"][0]]
        self.assertEqual(outcomes.count("success"), 1)
        self.assertEqual(outcomes.count("conflict"), 1)

        self.vehicle.refresh_from_db()
        self.driver.refresh_from_db()
        self.assertEqual(self.vehicle.status, VehicleStatus.AVAILABLE)
        self.assertEqual(self.driver.status, DriverStatus.AVAILABLE)
