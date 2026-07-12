import datetime
import threading

from django.db import connections
from django.test import TransactionTestCase
from django.utils import timezone

from drivers.models import Driver, DriverStatus
from trips.models import Trip
from vehicles.models import Vehicle, VehicleStatus

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
