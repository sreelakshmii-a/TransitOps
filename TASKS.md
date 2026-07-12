# TransitOps — 7.5 Hour Build Plan (3 devs, parallel, hourly commits)

Spec source: `TransitOps_High_Quality.md`

**Council-reviewed.** This plan went through an adversarial 4-lens review (Django-mechanics,
scheduling-realism, integration-seams, live-demo-failure). Verdict: not ready as raw first draft —
one literal build-blocker, three correctness gaps, and one demo-mechanics gap were found and are
now fixed inline below (marked **[council fix]**). None of it requires re-planning the day.

**Cutline correction vs. earlier planning:** the spec's "Mandatory Deliverables" list explicitly
includes RBAC, Maintenance, and Fuel tracking — these are NOT stretch goals. Only the separate
"Bonus" section (Charts, PDF export, Email reminders, Vehicle documents, Search, Dark mode) is
freely droppable. See the Cutline section near the bottom.

**Stack**: Django + Django REST Framework + PostgreSQL (local, no hosted DB dependency) +
`djangorestframework-simplejwt` for auth + React (Vite) frontend consuming the DRF API.

## Repo layout

```
transitops/
  transitops/          settings.py, urls.py, wsgi.py
  users/               (Dev A) — custom User model, auth views, RBAC permission classes
  vehicles/            (Dev A) — models.py, serializers.py, views.py, urls.py
  drivers/             (Dev A)
  maintenance/         (Dev A)
  fuel_expenses/       (Dev A)
  trips/               (Dev B)
  dispatch/            (Dev B) — dispatch_trip service + concurrency tests
  dashboard/           (Dev C's backend — KPI queries + CSV export view)
frontend/              (Dev C) — React/Vite
  src/
    pages/
    components/
    api/               thin fetch wrappers matching DRF routes
```

## Roles (fixed for the whole day — do not renegotiate mid-run)

- **Dev A — Fleet/Data core**: Vehicles, Drivers, Auth/RBAC (backend), Maintenance, Fuel & Expenses
- **Dev B — Trip & Dispatch**: Trip lifecycle, dispatch concurrency lock, dispatch-time business rules
- **Dev C — UI & KPI**: All screens, RBAC-aware UI, KPI dashboard + filters, Reports/CSV export

Branches: `dev-a`, `dev-b`, `dev-c`. Merge via PR at each checkpoint (11:00, 1:00pm, 3:00pm).
Commit at the end of every hour block below even if the task isn't fully finished —
partial-but-committed beats finished-but-uncommitted for the git-history requirement.

---

## Reference: full schema (Django models)

```python
# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Role(models.TextChoices):
    FLEET_MANAGER = "FLEET_MANAGER"
    DRIVER = "DRIVER"
    SAFETY_OFFICER = "SAFETY_OFFICER"
    FINANCIAL_ANALYST = "FINANCIAL_ANALYST"

class User(AbstractUser):
    role = models.CharField(max_length=32, choices=Role.choices)


# vehicles/models.py
class VehicleStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    IN_SHOP = "IN_SHOP"
    RETIRED = "RETIRED"

class Vehicle(models.Model):
    registration_number = models.CharField(max_length=32, unique=True)
    model = models.CharField(max_length=64)
    type = models.CharField(max_length=32)       # dashboard filter
    capacity = models.IntegerField()
    odometer = models.IntegerField()
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=VehicleStatus.choices, default=VehicleStatus.AVAILABLE)
    region = models.CharField(max_length=64)      # dashboard filter
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# drivers/models.py
class DriverStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    OFF_DUTY = "OFF_DUTY"

class Driver(models.Model):
    name = models.CharField(max_length=128)
    license = models.CharField(max_length=64)
    license_expiry = models.DateField()
    contact = models.CharField(max_length=64)
    safety_score = models.IntegerField(default=100)
    status = models.CharField(max_length=16, choices=DriverStatus.choices, default=DriverStatus.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)


# trips/models.py
class TripStatus(models.TextChoices):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Trip(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.PROTECT)
    driver = models.ForeignKey("drivers.Driver", on_delete=models.PROTECT)
    cargo_weight = models.IntegerField()
    origin = models.CharField(max_length=128)
    destination = models.CharField(max_length=128)
    status = models.CharField(max_length=16, choices=TripStatus.choices, default=TripStatus.DRAFT)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


# maintenance/models.py
class MaintenanceStatus(models.TextChoices):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class MaintenanceLog(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.CASCADE)
    reason = models.CharField(max_length=256)
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=MaintenanceStatus.choices, default=MaintenanceStatus.OPEN)
    started_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)


# fuel_expenses/models.py
class FuelLog(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.CASCADE)
    liters = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    odometer_at_fill = models.IntegerField()
    logged_at = models.DateTimeField(auto_now_add=True)

class ExpenseCategory(models.TextChoices):
    FUEL = "FUEL"
    MAINTENANCE = "MAINTENANCE"
    TOLL = "TOLL"
    OPERATIONAL = "OPERATIONAL"

class Expense(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", null=True, blank=True, on_delete=models.SET_NULL)
    trip = models.ForeignKey("trips.Trip", null=True, blank=True, on_delete=models.SET_NULL)
    category = models.CharField(max_length=16, choices=ExpenseCategory.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
```

## Reference: KPI formulas (Dev C implements against Dev A/B's tables)

- **Active Vehicles** = `Vehicle.objects.filter(status="ON_TRIP").count()`
- **Available Vehicles** = `Vehicle.objects.filter(status="AVAILABLE").count()`
- **Vehicles in Maintenance** = `Vehicle.objects.filter(status="IN_SHOP").count()`
- **Active Trips** = `Trip.objects.filter(status="DISPATCHED").count()`
- **Pending Trips** = `Trip.objects.filter(status="DRAFT").count()`
- **Drivers On Duty** = `Driver.objects.filter(status="ON_TRIP").count()`
- **Fleet Utilization** = `Vehicle.objects.filter(status="ON_TRIP").count() / Vehicle.objects.exclude(status="RETIRED").count() * 100`

All must be live queries on every dashboard request — no caching, no static JSON.

## Reference: dispatch-lock pattern (Dev B, the highest-risk piece)

Interface, fixed at 9:45 and never renegotiated:

```python
# dispatch/services.py
def dispatch_trip(trip_id: str) -> dict:
    """Returns {"success": True} or raises ConflictError(reason)."""
```

Implementation inside a single DB transaction with `select_for_update()`, so the row lock covers
the whole check-and-set:

```python
from django.db import transaction
from django.utils import timezone
from trips.models import Trip, TripStatus
from vehicles.models import Vehicle, VehicleStatus
from drivers.models import Driver, DriverStatus

class ConflictError(Exception):
    def __init__(self, reason):
        self.reason = reason

def dispatch_trip(trip_id):
    with transaction.atomic():
        trip = Trip.objects.select_related("vehicle", "driver").get(id=trip_id)
        vehicle = Vehicle.objects.select_for_update().get(id=trip.vehicle_id)
        driver = Driver.objects.select_for_update().get(id=trip.driver_id)

        if vehicle.status != VehicleStatus.AVAILABLE:
            raise ConflictError("vehicle_unavailable")
        if driver.status != DriverStatus.AVAILABLE:
            raise ConflictError("driver_unavailable")
        if driver.license_expiry < timezone.now().date():
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
```

`select_for_update()` inside `transaction.atomic()` is what makes two concurrent dispatch calls on
the same vehicle/driver serialize instead of race — the second call blocks until the first
commits, then re-reads `status = ON_TRIP` and raises `ConflictError("vehicle_unavailable")`
cleanly. **Concurrency test note**: Django's `TestCase` wraps each test in a transaction and won't
exercise real row-locking across threads — use `TransactionTestCase` (or a raw script with two
real DB connections/threads) to actually prove the lock works.

**[council fix] Pin the test database to Postgres, explicitly.** Django's default test runner uses
SQLite unless test settings say otherwise, and SQLite silently ignores `select_for_update()` — it
is a documented no-op there. If the concurrency test runs on SQLite while the app runs on local
Postgres, `TransactionTestCase` will report success **regardless of whether the lock actually
works**, because there is no real lock to defeat. That's a false green at the exact moment (the
1:00pm checkpoint) the team decides whether to keep `select_for_update()` or fall back. Add this to
the 9:30 contract lock as a one-line settings change: point `DATABASES` at Postgres for test
settings too, not the Django default.

**[council fix] The maintenance and trip-complete flows can clobber each other's vehicle status.**
Nothing stops a Fleet Manager from opening a `MaintenanceLog` on a vehicle that's currently
`ON_TRIP` — the vehicle becomes `IN_SHOP` in the DB while a trip still references it as dispatched,
and when that trip later completes/cancels, a naive `vehicle.status = AVAILABLE` assignment
silently overwrites `IN_SHOP`. Fix both sides:
- Maintenance-open should require `vehicle.status != ON_TRIP` (reject or explicitly warn otherwise).
- Complete/cancel must use a conditional update, not blind assignment:
  `Vehicle.objects.filter(id=vehicle_id, status=VehicleStatus.ON_TRIP).update(status=VehicleStatus.AVAILABLE)`
  so it can never overwrite a vehicle that's since moved to `IN_SHOP` by another flow.

**[council fix] The live two-tab demo does not, by itself, prove the lock works.** Two humans
clicking "Dispatch" in separate browser tabs is sequential at the HTTP level (200ms+ apart);
`select_for_update` contention only matters if the requests' transactions genuinely overlap at the
millisecond level. A judge will see "success" then a clean 409 — which is indistinguishable from
ordinary sequential validation and proves nothing about concurrency. The automated
`TransactionTestCase` forces real interleaving with threads; the live demo has no equivalent
forcing mechanism. Fix: add a debug-only artificial delay inside `dispatch_trip` (env-flagged,
disabled during tests and normal operation) that widens the race window enough for two manual
clicks to genuinely overlap — or script the demo as two near-simultaneous programmatic requests
(a tiny two-line script firing both `POST /api/dispatch/:id/` calls back-to-back) instead of manual
clicking. Whoever presents should also know, going in, whether `select_for_update()` or the
`filter().update()` fallback is the live implementation — don't let that be discovered live.

**Fallback if this isn't working by the 1:00pm checkpoint**: drop `select_for_update()` and instead
do the status check-and-set as a single atomic queryset update:

```python
updated = Vehicle.objects.filter(id=vehicle_id, status=VehicleStatus.AVAILABLE).update(status=VehicleStatus.ON_TRIP)
if updated == 0:
    raise ConflictError("vehicle_unavailable")
```

`.update()` compiles to one `UPDATE ... WHERE` statement, atomic at the DB level without explicit
row locking — weaker isolation guarantee but still closes the actual race for a single-instance
demo, and is a five-line change, not a redesign.

## Reference: API surface (DRF routes)

### Auth (Dev A)
- `POST /api/auth/register/` `{ username, email, password, role }` → `{ user }`
- `POST /api/auth/login/` `{ username, password }` → `{ access, refresh }` (simplejwt)
- `GET /api/auth/me/` (auth required) → `{ user }`

### Vehicles (Dev A) — `ModelViewSet` + `django-filter`
- `POST /api/vehicles/` → 409-style validation error on duplicate `registration_number`
  (DRF returns 400 by default for `UniqueValidator` — that's fine, judges care about server-side
  enforcement, not the exact status code)
- `GET /api/vehicles/?type=&status=&region=`
- `GET /api/vehicles/:id/`, `PATCH /api/vehicles/:id/`
- `DELETE /api/vehicles/:id/` — only if `status != ON_TRIP`

### Drivers (Dev A)
- `POST /api/drivers/`, `GET /api/drivers/?status=`, `PATCH /api/drivers/:id/`
- `DELETE /api/drivers/:id/` — only if `status != ON_TRIP`

### Maintenance (Dev A)
- `POST /api/maintenance/` `{ vehicle, reason, cost }` → sets `Vehicle.status = IN_SHOP`, creates `OPEN` log
- `POST /api/maintenance/:id/close/` (custom `@action`) → sets `Vehicle.status = AVAILABLE`, log `CLOSED` + `closed_at`
- `GET /api/maintenance/?vehicle=&status=`

### Fuel & Expenses (Dev A)
- `POST /api/fuel-logs/`, `GET /api/fuel-logs/?vehicle=`
- `POST /api/expenses/`, `GET /api/expenses/?category=&vehicle=`

### Trips (Dev B)
- `POST /api/trips/` `{ vehicle, driver, cargo_weight, origin, destination }` → creates `DRAFT`,
  validates `cargo_weight <= vehicle.capacity` at creation time too (fail fast, not just at dispatch)
- `GET /api/trips/?status=&region=`
- `POST /api/trips/:id/complete/` (custom `@action`) → transaction: `Trip.status = COMPLETED`,
  `completed_at = now()`, `Vehicle.status = AVAILABLE`, `Driver.status = AVAILABLE`
- `POST /api/trips/:id/cancel/` → same release logic, `Trip.status = CANCELLED`

### Dispatch (Dev B)
- `POST /api/dispatch/:trip_id/` → runs `dispatch_trip` from the pattern above. Returns 409 with
  `{ "reason": conflictReason }` on any business-rule failure or lock conflict (use a DRF exception
  handler that maps `ConflictError` → `status.HTTP_409_CONFLICT`).

**[council fix] `RETIRED` has no reachable endpoint as originally scoped.** It's in the schema and
enum but nothing in the API surface lets a vehicle reach it — add `PATCH /api/vehicles/:id/retire/`
as a trivial custom action in Dev A's Hour 1/2 work (a two-line view), or explicitly write "not
reachable this build" in this doc so nobody wonders about it during demo prep at 4pm.

### Dashboard (Dev C, reading A/B's tables)
- `GET /api/dashboard/kpis/?type=&status=&region=` → the six KPI formulas above, filtered
- `GET /api/reports/csv/?type=trips|fuel|expenses` → raw CSV export via `django.http.HttpResponse`
  with `content_type="text/csv"` (the one Reports item worth keeping if time is short — see Cutline)

### RBAC (Dev A writes the class; each dev applies it to their own viewsets)
Custom DRF permission class:
```python
class HasRole(BasePermission):
    def __init__(self, *roles):
        self.roles = roles
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.roles
```
Applied per viewset per the spec's role table: Fleet Manager → full vehicles/drivers/maintenance
access; Driver → trips read + own trip dispatch/complete/cancel; Safety Officer → drivers/
maintenance read + compliance fields; Financial Analyst → fuel/expenses/reports read.

**[council fix] Ownership of applying `HasRole` is explicit, not implied.** A writes the class in
Hour 3, but Maintenance/Fuel/Expense endpoints don't exist until Hours 4-5, owned by A anyway, so A
applies `HasRole` in the same commit as each endpoint — it is not a one-time Hour-3 sweep across
files A doesn't own. For Trip/Dispatch views (owned by B), B applies `HasRole` when building those
endpoints, importing A's class once it's committed — A never touches B's `views.py`. This avoids
both a merge conflict on shared files and RBAC silently staying half-applied under time pressure.

**[council fix] "Driver can only act on their own trip" is an explicit task, not an implicit
reading of the role table.** The spec's role table implies a Driver can only dispatch/complete/
cancel trips assigned to them, which requires filtering by `trip.driver_id == request.user`'s
linked driver record — this needs its own line item (assigned to B, since B owns the Trip/
Dispatch views) rather than being assumed to fall out of `HasRole` alone.

**[council fix] Freeze the exact status-enum symbols and 409 error-body shape at the 9:30 contract
lock, not verbally.** B's dispatch code must `import` A's `VehicleStatus`/`DriverStatus` choices
classes rather than hardcoding string literals like `"ON_TRIP"` — a later rename/casing change in
A's enum would otherwise silently desync from B's hardcoded strings, and the failure is silent
(a `filter().update()` that matches zero rows just reads as an ordinary 409, not a crash). Also
freeze the 409 response body's exact key now: `{"reason": str, "code": str}` — DRF's default
exception handler emits `{"detail": ...}`, and C's Hour-3 dispatch/complete/cancel UI (built the
same hour B writes the `ConflictError` reasons) needs the real key name up front, not a guess.

---

## 0. Contract lock (9:30–9:45, all three together)

**[council fix] This session must produce written artifacts everyone pulls before writing any
migration — not verbal agreement.** The single sharpest issue the council found is that `Trip`
(Dev B, Hour 1) has an FK to `Driver`, but `Driver` isn't scheduled to be built until Dev A's
Hour 2 — meaning B literally cannot run `makemigrations` for `Trip` as originally sequenced. The
same root cause (contract lock too soft to prevent Hour-1 collisions between branches scaffolding
independently) also creates an `AUTH_USER_MODEL` race: if anyone generates a migration touching
`User` before A's custom `User` model + `AUTH_USER_MODEL` setting is committed and pulled, it
resolves against `auth.User` and needs a squash later. Fix both with the same discipline:

Agree and commit (each person's commit #1, on their own branch):

- The schema above (adjust field names/types together if you deviate — lock it in writing)
- **A commits bare-bones `User` (with `AUTH_USER_MODEL` already pointed at it), `Vehicle`, and
  `Driver` model stubs — real enough to FK against, even if fields/validation land later — before
  anyone else writes a migration that references any of them.** B and C pull this before touching
  their own models. This is 10 minutes of work, not a full CRUD build, but it must happen inside
  this 15-minute window, not during Hour 1 proper.
- Shared status-enum symbols as importable classes (`VehicleStatus`, `DriverStatus`, `TripStatus`),
  not string literals either dev retypes — B imports A's classes in `dispatch_trip`, never
  hardcodes `"ON_TRIP"`
- The dispatch-lock interface signature — fixed now, never renegotiated
- The 409 error-body shape: `{"reason": str, "code": str}` — frozen now since C consumes it the
  same hour B writes it (Hour 3)
- Test settings pinned to Postgres (not the Django/SQLite default) so the concurrency test can't
  false-pass
- The API paths above, at least for the first two hours of work, so Dev C can start against real
  shapes instead of guessing
- `django-admin startproject transitops && python manage.py startapp <name>` for each app listed
  in Repo layout — one person runs this once and everyone pulls, to avoid three different project
  skeletons

## Hour 1 (9:45–11:00, 75 minutes — [council fix] extended from 60 so the 11:00 checkpoint lands on a boundary, not mid-task) — commit ~10:50, before the checkpoint

- **A**:
  - Flesh out the `User`/`Vehicle`/`Driver` stubs committed at contract lock into real models +
    migrations (fields, `role` choices, unique `registration_number`)
  - `POST/GET /api/vehicles/` via `ModelViewSet` with unique-registration and status-enum validation
  - `feat(vehicles): schema + CRUD + unique registration validation`
- **B**:
  - `Trip` model + migration — now safe, since it FKs against A's already-committed `Vehicle`/
    `Driver` stubs from contract lock, not models that don't exist yet
  - `POST /api/trips/` creating `DRAFT` rows, with `cargo_weight <= vehicle.capacity` check at creation
  - `POST /api/dispatch/:trip_id/` stub that calls the (not-yet-implemented) lock interface and
    returns a hardcoded success — unblocks Dev C's UI work immediately
  - `feat(trips): schema + draft creation + dispatch stub`
- **C**:
  - Login page + JWT storage (access/refresh), protected route wrapper
  - App shell: nav with role-conditional links (even if RBAC enforcement isn't wired server-side
    yet — build the shape now, wire the guard in Hour 3)
  - `feat(auth): login scaffold + app shell + routing`

## Hour 2 (11:00–12:00) — commit ~11:55

**Checkpoint 1 at 11:00**: merge all three branches into main. C swaps any mocked calls for real endpoints.

- **A**:
  - `Driver` model + migration; `POST/GET /api/drivers/` with `license_expiry` validation helper
    (`is_license_expired(driver)`) reusable by Dev B's dispatch rule check
  - `feat(drivers): CRUD + license expiry validation`
- **B**:
  - Implement `dispatch_trip` with `select_for_update()` from the Reference pattern above
  - Concurrency test using `TransactionTestCase` (or a two-thread script) firing two simultaneous
    dispatch calls on the same driver/vehicle, asserting exactly one succeeds
  - `feat(dispatch): transactional lock + concurrency test`
- **C**:
  - Vehicle list/create/edit forms wired to real `/api/vehicles/` endpoints
  - Driver list/create/edit forms wired to real `/api/drivers/` endpoints
  - `feat(ui): vehicle/driver CRUD screens`

## Hour 3 (12:00–1:00) — commit ~1:00

- **A**:
  - `HasRole` permission class written and applied to Vehicle/Driver viewsets now; applied to
    Maintenance/Fuel/Expense viewsets later, in the same commit that builds each of those (see
    RBAC ownership note above) — not a one-time sweep
  - `feat(rbac): role permission class + vehicle/driver viewset guards`
- **B**:
  - Wire `is_license_expired`, vehicle-status check, cargo-capacity check, and driver/vehicle
    concurrent-trip check into `dispatch_trip` (all four business rules from the spec's Mandatory
    Business Rules section, each raising a distinct `ConflictError` reason, using the frozen
    `{"reason": str, "code": str}` shape agreed at contract lock)
  - Apply `HasRole` to Trip/Dispatch views (importing A's class); add the "driver can only act on
    their own trip" filter for dispatch/complete/cancel
  - **[council fix] Commit a minimal seed-data fixture now** (a handful of vehicles/drivers/trips
    covering each status) — just enough for Hour 6 integration testing to have something to run
    against even if B falls behind later; enrich it in Hour 5
  - `feat(trips): dispatch business rule validation + own-trip scoping + seed data stub`
- **C**:
  - Trip creation form + list, Dispatch button (shows `reason` on 409), Complete/Cancel actions
  - Hide nav links / disable actions per the authenticated user's `role` from A's guard
  - `feat(ui): trip lifecycle screens + role-based UI`

## Hard checkpoint — 1:00pm

Dispatch lock + trip lifecycle must be merged and passing the concurrency test by now. If not:
switch to the fallback described in the Reference pattern (single `.filter(...).update(...)`
queryset) and move on — do not let the row-lock version block the merge. Keep hardening it as a
parallel commit only if there's slack later.

## Hour 4 (1:00–2:00) — commit ~2:00

- **A**:
  - `POST /api/maintenance/` (sets vehicle `IN_SHOP`, creates `OPEN` log — **[council fix] reject
    or warn if `vehicle.status == ON_TRIP`**, don't allow opening maintenance mid-trip), `POST
    /api/maintenance/:id/close/` (sets vehicle `AVAILABLE`, log `CLOSED` + `closed_at`)
  - Apply `HasRole` to the Maintenance viewset in this same commit
  - `feat(maintenance): status transitions + guard against mid-trip maintenance + rbac`
- **B**:
  - `POST /api/trips/:id/complete/` and `/cancel/` — **[council fix] use a conditional
    `filter(status=DISPATCHED).update(...)` release, not blind assignment**, so completing/
    cancelling a trip can never overwrite a vehicle that A's maintenance flow has since moved to
    `IN_SHOP`; guard against acting on a trip that isn't `DISPATCHED`
  - `feat(trips): complete/cancel flows + conditional status release`
- **C**:
  - `GET /api/dashboard/kpis/` skeleton wired to the six KPI formulas — real queries, visible refresh
  - `feat(dashboard): KPI tiles wired to live queries`

## Hour 5 (2:00–3:00) — commit ~3:00

- **A**:
  - `POST /api/fuel-logs/`, `POST /api/expenses/`, corresponding `GET` list endpoints; apply
    `HasRole` (Financial Analyst read access) in the same commit
  - `feat(fuel-expenses): models + endpoints + rbac`
- **B**:
  - Harden edge cases (double-cancel, complete-a-draft, etc.); enrich the seed-data fixture started
    in Hour 3 — every status combination plus one deliberate double-dispatch scenario for the demo
  - `fix(trips): edge cases + seed data enrichment`
- **C**:
  - Maintenance open/close UI, fuel/expense logging forms
  - Dashboard filters (vehicle type, status, region) wired to the `GET /api/vehicles/` and
    `/api/dashboard/kpis/` query params
  - `feat(ui): maintenance + fuel logging screens + dashboard filters`

## Feature freeze — 3:00pm

Cut all six **Bonus** items now if not already done: Charts, PDF export, Email reminders, Vehicle
documents, Search, Dark mode. Zero deliverable cost — none of these are in the Mandatory list.

If still behind at this point: degrade the **Reports** page down to `GET
/api/reports/csv/?type=trips|fuel|expenses` only — raw CSV export, no charts or ratio
calculations. Reports isn't itself one of the 8 explicitly-named Mandatory Deliverables (Fuel
tracking is, the analytical Reports page isn't), so this is the one remaining lever after Bonus
items are gone.

**Never cut, regardless of time pressure:** Responsive UI, RBAC, CRUD, Trip management, Automatic
status transitions, Maintenance, Fuel tracking, KPI dashboard. If any of these is at risk at
3:30pm, all three swarm it instead of continuing solo work on separate pieces.

## Hour 6 (3:00–4:00) — commit ~4:00 (integration/bugfix only)

Cross-test each other's flows end to end using B's seed data. Commit fixes as found:
- `fix: validation edge cases` (A)
- `fix: dispatch race conditions found in integration test` (B)
- `fix: UI bugs from integration pass` (C)

## Hour 6.5–7 (4:00–4:30) — commit ~4:30

Continue hardening. If genuinely ahead of schedule: CSV export (A/C) is the cheapest spec-adjacent
win. Otherwise this hour is entirely bugfix and seed-data polish — no new scope.

## Final buffer (4:30–5:00) — sacred, no feature work

- `python manage.py migrate` from a clean DB + reseed, confirm the whole flow still works
- **[council fix] Rehearse the concurrency demo using the forcing mechanism built in Hour 5**
  (debug-only artificial delay in `dispatch_trip`, or the two-near-simultaneous-request script) —
  not plain manual two-tab clicking, which is sequential at the HTTP level and doesn't actually
  prove the lock did anything. Know going in whether `select_for_update()` or the `filter().update()`
  fallback is the live implementation, so the presenter isn't caught flat-footed if asked.
- Final commit: seed data / demo script only, nothing else

## Definition of "done" at 5:00pm

A judge can: log in as a role → create a Vehicle and Driver (unique reg + license-expiry
validated) → create a Trip in Draft → Dispatch it (status/license/capacity/concurrency rules
enforced — firing two simultaneous dispatch attempts on the same driver/vehicle, exactly one
succeeds) → Complete or Cancel it (status releases correctly) → see a vehicle auto-enter
Maintenance and release back to Available → log a fuel/expense entry → view a KPI dashboard with
live, filterable counts. All server-validated against a local Postgres DB, with three branches
showing real hourly commits from each person merged via PR at 11:00, 1:00, and 3:00.
