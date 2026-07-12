# Dev C Implementation Log — TransitOps

Owner: Dev C (UI & KPI — all screens, RBAC-aware UI, KPI dashboard + filters, Reports/CSV export)
Source docs: `TASKS (1).md` (build plan), `TransitOps Smart Transport Operations Platform.pdf` (PRD)

This file tracks what's actually been built, hour by hour, plus decisions and open questions —
so progress is visible without re-reading the whole chat. Update it as each hour's work lands,
not just at the end.

---

## Locked decisions (don't re-litigate mid-run)

| Decision | Choice | Why |
|---|---|---|
| Frontend stack | Vite + React (JS) + React Router + Context API + fetch | speed over safety for an 8h build |
| Styling | Plain CSS, no component library | avoid setup tax |
| Frontend location | `frontend/` at repo root | per TASKS.md repo layout |
| Login field | **email + password** (PRD 3.1), not username | user confirmed PRD is authoritative; Dev A needs to be told `/api/auth/login/` must accept email — **flag at 11:00 checkpoint** |
| Conflict resolution rule | **PRD is the final verdict** whenever PRD and TASKS.md disagree | explicit user instruction — applies to all future conflicts, not just login |
| Unblocking before 11:00 merge | Mock API layer behind a `USE_MOCKS` flag, matching frozen contract shapes | lets Hour 1 UI work start without waiting on Dev A/B |
| 409 error shape | `{"reason": str, "code": str}` (not DRF default `{"detail": ...}`) | frozen at contract lock in TASKS.md |
| Git workflow | Claude does not touch git (branch/commit/push) | user handles all git themselves |
| Role enum values | `FLEET_MANAGER`, `DRIVER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST` | from `users/models.py` Role choices |

## Open questions / risks (unresolved)

- [x] ~~Login email vs username mismatch~~ — resolved: PRD wins, login uses email. Still need to tell Dev A `/api/auth/login/` must accept email, not username — flag at 11:00 checkpoint.
- [ ] Exact KPI query params (`?type=&status=&region=`) — confirm Dev C's dashboard filter UI matches Dev A's vehicle `type`/`region` field values once real data exists.
- [ ] Whether Dev B's dispatch stub (Hour 1, hardcoded success) response shape matches the final `{"reason","code"}` contract — verify at 11:00 swap.
- [ ] Backend `/api/vehicles/`, `/api/drivers/`, `/api/trips/`, `/api/dispatch/`, `/api/maintenance/`, `/api/fuel-logs/`, `/api/expenses/`, `/api/dashboard/kpis/`, `/api/reports/csv/` not confirmed live as of build completion — the entire frontend is still running on `USE_MOCKS=true`. This is the single biggest remaining risk: swap to real endpoints and re-verify every page before the demo.
- [ ] Dashboard KPI filter semantics (type/status/region narrowing the vehicle queryset only, trips/drivers KPIs staying global) is Dev C's own interpretation — confirm against Dev A's real implementation.
- [ ] PRD 3.7's "Automatically compute total operational cost (Fuel + Maintenance) per vehicle" has no dedicated endpoint in TASKS.md's API surface — Dev C computed it client-side from the fuel-logs/maintenance-logs lists already being fetched. Fine for the mock/demo, but if Dev A's real API doesn't return all fuel/maintenance records to a paginated list, this client-side sum could be wrong against real data — worth a quick sanity check once wired to the real backend.
- [ ] PRD's driver "License Category" field is missing from TASKS.md's `Driver` model — frontend added `license_category`; flag to Dev A to add it server-side.
- [ ] Driver `status` values: PRD 3.4 lists **Available, On Trip, Off Duty, Suspended** (4 values) but TASKS.md's `DriverStatus` model only has **AVAILABLE, ON_TRIP, OFF_DUTY** (no Suspended), even though PRD's Mandatory Business Rules explicitly bars Suspended drivers from trips. Per "PRD is final," frontend will treat `SUSPENDED` as a valid driver status/filter option — flag to Dev A that the backend enum is missing it.

---

## Hour-by-hour checklist

### Hour 1 (9:45–11:00) — Login, routing, app shell
- [x] Scaffold `frontend/` with Vite + React, install `react-router-dom`
- [x] `AuthContext` (access/refresh tokens in localStorage, `user`, `login()`, `logout()`)
- [x] Login page (email + password) → `api/auth.js`
- [x] `ProtectedRoute` wrapper
- [x] App shell: nav with role-conditional links (shape only, no server enforcement yet)
- [x] Mock fixtures + `USE_MOCKS` toggle for all resource wrappers (auth done; vehicles/drivers/trips/etc. wrappers still to add as each page is built)
- [ ] Commit: `feat(auth): login scaffold + app shell + routing` — **not committed, user handles git**

**Status:** done, verified in browser (Playwright smoke test: login → dashboard → role-conditional nav → vehicles placeholder → logout, zero console errors)
**Notes:**
- Files: `src/api/{client,tokenStorage,mockData,auth}.js`, `src/context/AuthContext.jsx`,
  `src/components/{ProtectedRoute,AppShell,NavBar,PlaceholderPage}.jsx`, `src/pages/*.jsx`, `src/App.jsx`, `src/index.css`.
- Mock users (email/password, `USE_MOCKS=true` in `.env`): `fleet@transitops.test` (FLEET_MANAGER),
  `driver@transitops.test` (DRIVER), `safety@transitops.test` (SAFETY_OFFICER), `finance@transitops.test`
  (FINANCIAL_ANALYST) — all password `password123`.
- Nav visibility per role is Dev C's own interpretation of the PRD's role descriptions (no explicit
  table exists) — see note in `NavBar.jsx`. Worth a quick sanity check against whatever Dev A's
  `HasRole` guards end up enforcing, but not a blocker since it's UI-only right now.
- Removed unused Vite template assets/CSS (App.css, hero/react/vite svgs) to keep the tree clean.

### Hour 2 (11:00–12:00) — Vehicle & Driver CRUD
_Checkpoint 1 at 11:00: merge all branches, swap mocks for real endpoints._
- [x] Vehicle list/create/edit/delete → `api/vehicles.js` (still mock-backed, `USE_MOCKS=true`; Dev A's real `/api/vehicles/` not up yet per user)
- [x] Driver list/create/edit/delete → `api/drivers.js` (same, mock-backed)
- [ ] Commit: `feat(ui): vehicle/driver CRUD screens` — **not committed, user handles git**

**Status:** done, verified in browser (Playwright: create/duplicate-reject/edit/filter/delete on
both Vehicles and Drivers, zero console errors)
**Notes:**
- Files: `src/constants.js`, `src/api/{vehicles,drivers}.js`, `src/components/{VehicleForm,DriverForm}.jsx`,
  `src/pages/{VehiclesPage,DriversPage}.jsx`, CSS additions in `src/index.css`.
- Delete is disabled client-side (and mock-rejected server-side) when `status === "ON_TRIP"`, per
  the spec's rule. Real backend should enforce this too — no {reason,code} shape specified for this
  case in TASKS.md (that shape is reserved for dispatch 409s), so it's treated as a plain 400 detail.
- Duplicate `registration_number` returns a DRF-style field error
  (`{registration_number: ["...already exists."]}`) — form surfaces it inline under the field.
- **New discrepancy found & resolved per "PRD is final":** PRD 3.4 lists a driver field "License
  Category" that TASKS.md's `Driver` model schema omits entirely. Added `license_category` (free
  text) to the driver form/table/mock fixtures. Flag to Dev A: backend `Driver` model needs this
  field added, or PATCH/POST bodies will silently drop it (DRF ModelSerializer ignores unknown keys
  rather than erroring, so this fails silently, not loudly — worth Dev A double-checking on purpose).
- License expiry shown inline with a red "Expired" tag per row (compliance visibility, matches PRD's
  Safety Officer persona) — small addition beyond the literal Hour 2 scope but cheap and spec-aligned.

### Hour 3 (12:00–1:00) — Trip lifecycle + role-based UI
- [x] Trip creation form + list (filters: status, region)
- [x] Dispatch button, surfaces `reason` on 409 (mapped to human-readable text)
- [x] Complete / Cancel actions
- [x] Hide nav links / disable actions per `user.role` (nav done Hour 1; per-row action gating added this hour)
- [x] "Driver can only act on their own trip" scoping (TASKS.md's explicit RBAC line item)
- [ ] Commit: `feat(ui): trip lifecycle screens + role-based UI` — **not committed, user handles git**

**Status:** done, verified in browser (Playwright: created two trips on the same vehicle/driver,
dispatched one, confirmed the second gets a clean 409 `vehicle_unavailable` with the reason shown
inline, completed/cancelled, then re-dispatched — plus confirmed DRIVER-role nav restriction and
own-trip action scoping. Zero console errors.)
**Notes:**
- Files: `src/api/{trips,dispatch}.js`, `src/components/TripForm.jsx`, `src/pages/TripsPage.jsx`,
  `src/constants.js` (added `TRIP_STATUSES`, `DISPATCH_REASON_MESSAGES`), CSS additions.
- Mock `dispatch_trip` mirrors `dispatch/services.py`'s four business rules in the same order
  (vehicle available → driver available → license not expired → cargo ≤ capacity), returning the
  frozen `{reason, code}` shape on conflict.
- Trip create/edit vehicle & driver dropdowns only list `AVAILABLE` options (Retired/In Shop
  vehicles and expired/suspended/unavailable drivers never appear), matching PRD's Mandatory
  Business Rules directly in the UI, not just relying on the dispatch-time check.
- Complete/Cancel use a "release only if vehicle/driver is currently ON_TRIP" pattern in the mock,
  mirroring the backend's conditional-update fix from TASKS.md's council notes (won't clobber a
  vehicle that maintenance has since moved to IN_SHOP) — worth confirming Dev B's real
  implementation does the same once it's live.
- Added `driver_id: 1` to the mock `driver_alex` login (linking it to "Alex Menon") purely so
  own-trip scoping has something real to test against — this is a mock-only convenience, not
  something Dev A's backend needs to replicate as-is (real backend presumably links User → Driver
  via its own FK/lookup).

### Hard checkpoint — 1:00pm
Dispatch lock + trip lifecycle must be merged & passing concurrency test. If not, backend falls
back to `.filter().update()` — no frontend impact expected (same response contract).

### Hour 4 (1:00–2:00) — KPI dashboard skeleton
- [x] `GET /api/dashboard/kpis/` wired to six KPI tiles + Fleet Utilization, live queries
- [x] Visible refresh (manual "Refresh" button + "Last updated" timestamp; also auto-reloads on filter change)
- [ ] Commit: `feat(dashboard): KPI tiles wired to live queries` — **not committed, user handles git**

**Status:** done, verified in browser (Playwright: correct baseline counts, correct math when
filtered to a single status, math re-verified against a live scenario in the Hour 6 E2E run below)
**Notes:**
- Files: `src/api/dashboard.js`, `src/pages/DashboardPage.jsx`, CSS additions (`.kpi-grid`, `.kpi-tile`).
- **Filter semantics are Dev C's interpretation, not spelled out in TASKS.md:** `type`/`status`/`region`
  narrow the *Vehicle* queryset used for the vehicle-derived KPIs (Active/Available/Maintenance
  Vehicles, Fleet Utilization). Active Trips, Pending Trips, and Drivers On Duty stay global since
  those filters are vehicle attributes, not trip/driver attributes. Worth confirming against Dev A's
  actual `/api/dashboard/kpis/` once it's live — flagged in Open Questions.

### Hour 5 (2:00–3:00) — Maintenance/fuel UI + filters
- [x] Maintenance open/close UI (guards against opening on an `ON_TRIP` vehicle; close restores to
  `AVAILABLE` unless `RETIRED`, per PRD rule 4)
- [x] Fuel log + expense logging forms
- [x] Dashboard filters (vehicle type, status, region) wired to query params (built as part of Hour 4's page)
- [x] Per-vehicle Operational Cost (Fuel + Maintenance) table — PRD 3.7 requirement, not in TASKS.md's
  API surface, added directly to the Fuel & Expenses page since no separate endpoint was specified
- [ ] Commit: `feat(ui): maintenance + fuel logging screens + dashboard filters` — **not committed, user handles git**

**Status:** done, verified in browser (Playwright: opened maintenance on a vehicle → confirmed it
flipped to `IN_SHOP` → closed it → confirmed it returned to `AVAILABLE`; logged fuel + an expense and
confirmed the operational cost table recalculated live and correctly)
**Notes:**
- Files: `src/api/{maintenance,fuelExpenses}.js`, `src/components/{MaintenanceForm,FuelLogForm,ExpenseForm}.jsx`,
  `src/pages/{MaintenancePage,FuelExpensesPage}.jsx`.
- Maintenance-create vehicle dropdown excludes `ON_TRIP` vehicles client-side (defense in depth on
  top of the mock's server-side rejection) — matches TASKS.md's council fix.

### Feature freeze — 3:00pm
Bonus items (charts, PDF export, email reminders, vehicle docs, search, dark mode) — **not built**,
per the plan's explicit cut list. Zero deliverable cost, none attempted.

### Hour 6 (3:00–4:00) — Integration/bugfix
- [x] Cross-tested the full journey end to end in one continuous session (Playwright): login → create
  Vehicle (unique reg enforced) → create Driver (valid license) → create Trip Draft (cargo ≤ capacity)
  → Dispatch (all 4 business rules) → Complete → vehicle auto-releases → open Maintenance → vehicle
  auto-enters `IN_SHOP` → close → releases to `AVAILABLE` → log Fuel entry → operational cost
  recalculates → KPI dashboard reflects everything live. Zero console errors on the full run.
- [x] **Found and fixed a real bug during this pass:** opening "New Trip" (or Maintenance/Fuel/Expense)
  before their reference dropdowns (vehicles/drivers/trips) finished their initial fetch left the
  `<select>`s with no real options and no loading indicator. A user who filled the form fast enough
  would hit the browser's native HTML5 "required" validation silently blocking submit — no visible
  error, just nothing happening. Fixed by tracking a `refsLoaded` flag per page and disabling the
  "+ New ..." buttons (with a "Loading…" tooltip) until reference data has actually arrived.
- [x] Also found the Trip Complete/Cancel handlers weren't refreshing the vehicle/driver reference
  lists (only Dispatch was) — so reopening "New Trip" right after completing one could show a
  just-released vehicle as still unavailable. Fixed by extracting a shared `refreshRefs()` called
  from all three trip actions.
- Commit: `fix: UI bugs from integration pass` — **not committed, user handles git**

**Status:** done

### Hour 6.5–7 (4:00–4:30) — Hardening / stretch
- [x] CSV export wired: "Export CSV" on Trips (`type=trips`), "Export Fuel CSV" / "Export Expenses CSV"
  on Fuel & Expenses (`type=fuel` / `type=expenses`). Mock mode generates the CSV client-side from the
  same mock arrays; real mode fetches `GET /api/reports/csv/?type=...` as a blob and downloads it.
  Verified via Playwright's `download` event.
- Commit: `feat(reports): CSV export buttons` — **not committed, user handles git**

**Status:** done

### Final buffer (4:30–5:00) — sacred, no feature work
- [x] Full flow re-verified end to end (see Hour 6 above) — this doubles as the final buffer's
  "confirm the whole flow still works" check, since there's no backend/DB on Dev C's side to
  migrate+reseed. **This does not cover Dev A/B's actual Postgres migrate+reseed** — that's their
  final-buffer item, not something the frontend alone can verify.
- [ ] No commits made by Claude — nothing to do here on Dev C's side beyond what's above.

**Status:** done (frontend scope only)

---

## What's NOT done / explicitly out of scope

- **Nothing is wired to a real backend.** Every page is still running on the mock API layer
  (`USE_MOCKS=true`). The single most important next step before a live demo is confirming Dev A/B's
  endpoints are up, then flipping `VITE_USE_MOCKS=false` in `frontend/.env` and smoke-testing each
  page against the real API — response shapes were built to match the frozen contract exactly, but
  that's only as good as both sides actually agreeing in practice.
- **The concurrency race itself cannot be proven from the frontend.** TASKS.md's definition of done
  requires firing two *simultaneous* dispatch requests and confirming exactly one succeeds — that's
  inherently a backend (`select_for_update()` / `TransactionTestCase`) concern. The frontend's dispatch
  UI correctly *surfaces* a 409 when the mock/backend rejects a request, but proving the race was won
  correctly under real concurrent load is Dev B's job, not something this UI can demonstrate on its own.
- Bonus features still not built: PDF export, email reminders, vehicle documents, search/sort.
  **Charts and dark mode were later un-cut** — see the UX Redesign section below, added after the
  user explicitly requested them post-build (not part of the original Hour 1-7 plan).
- Nothing has been committed to git — every hour's work above is sitting in the working tree on
  (presumably) the `dev-c` branch; committing/pushing/PR is entirely the user's action.

---

## UX Redesign (post-build, user-requested)

After the Hour 1-7 build was functionally complete, the user asked for a full visual pass: dark
theme app-wide, plus a more visual/interactive dashboard, referencing two SaaS dashboard inspiration
images (card-based layout, left sidebar nav, colorful stat tiles, an activity chart).

**What changed:**
- **Dark theme is now the only theme** (not a `prefers-color-scheme` toggle — user asked for the
  whole app to be dark). Color tokens in `src/index.css` were rebuilt from the `dataviz` skill's
  validated dark palette (`references/palette.md`): page plane `#0d0d0d`, card surface `#1a1a19`,
  primary/secondary/muted ink, hairline borders — so the app and any future charts share one
  consistent, contrast-checked system rather than ad hoc hex values.
- **Top navbar → left sidebar.** `NavBar.jsx` deleted, replaced by `src/components/Sidebar.jsx`
  (icon + label nav, active-state pill, user avatar/role/logout pinned to the bottom).
  `AppShell.jsx` updated to a sidebar+content flex layout; both panels are rounded floating cards
  on the dark page background, matching the "framed panel" look in both inspiration images.
- **New icon set**: `src/components/icons.jsx` — hand-drawn inline SVGs (no icon library installed,
  keeps the bundle dependency-free). Used in the sidebar nav and the KPI tiles.
- **Dashboard redesign**:
  - KPI tiles now have colored icon badges (one per metric) instead of plain numbers.
  - **Fleet Utilization pulled out of the KPI grid and rebuilt as a meter** (track + fill), per the
    dataviz skill's form guidance: "a single ratio against a limit" is a meter, not a stat tile.
  - **Added a real chart**: `src/components/FleetStatusChart.jsx`, a hand-rolled bar chart (no
    charting library) showing live vehicle counts by status, respecting the same
    type/status/region filters as the KPI tiles. Built to the dataviz skill's mark spec: ≤24px
    bars, 4px rounded tip, direct value label at the tip, category label on the axis, per-bar
    hover tooltip, no legend needed (categories are already axis-labeled).
  - Bar colors are the **validated dark-surface categorical hues** from `validate_palette.js`
    (`#008300` green / `#3987e5` blue / `#c98500` amber / `#e66767` red), not the raw "status"
    palette hex — those are validated for text/badge contrast only, not as chart fills. Ran the
    validator (`node scripts/validate_palette.js "#008300,#3987e5,#c98500,#e66767" --mode dark
    --surface "#1a1a19"`) — all checks pass.
  - New `getVehicleStatusBreakdown()` in `api/dashboard.js` powers the chart. Deliberately built on
    `GET /api/vehicles/` (already in the real contract) rather than piggybacking an extra field on
    `/api/dashboard/kpis/` that Dev A's real endpoint has no obligation to return — keeps working
    whether `USE_MOCKS` is on or off.
  - Status badges across every page (Vehicles/Drivers/Trips/Maintenance) were re-mapped onto the
    same semantic colors (good/warning/critical/neutral) for consistency, still using the "soft
    tint background + full-strength text" pill pattern.
- **Every other page** (Vehicles, Drivers, Trips, Maintenance, Fuel & Expenses, Login) picked up the
  dark theme automatically since they were already built against CSS custom properties rather than
  hardcoded colors — confirmed visually via screenshots, no page-specific rework needed beyond the
  shared token/layout changes.

**Verified**: full build, then Playwright screenshots of Login/Dashboard/Vehicles/Trips/Fuel pages,
plus a hover check on the bar chart tooltip. Zero console errors.

**Not done**: no light-mode fallback exists anymore (single dark theme, as requested); no chart
beyond the one Fleet Status bar chart (PDF/email/docs/search bonus items still untouched).

---

## Driver-persona dashboard (role-specific redesign)

User feedback: the dashboard was "boring" and identical for every role. Asked for the Driver
persona specifically first: a popup when the driver has a pending trip request, and a graphical
view of that driver's own trip history. Other roles' dashboards are unchanged for now (explicitly
deferred — "let's do it for the driver persona" first).

**Data model decision**: there's no "trip request" concept in the schema. Mapped it onto the
existing model — **a Draft trip already assigned to this driver counts as a pending request**,
since that's the real state a Fleet-Manager-created, not-yet-dispatched trip sits in. Confirmed with
user before building (not a silent assumption).

**What changed:**
- `DashboardPage.jsx` is now a thin role-based router: `DRIVER` → `DriverDashboard.jsx`, everyone
  else → `FleetDashboard.jsx` (the existing dashboard from the earlier redesign, renamed but
  otherwise untouched). Split this way rather than branching inside one component because the two
  need different data-fetching hooks, and conditionally skipping hooks isn't legal React.
- **`PendingTripModal.jsx`** — pops up immediately when `DriverDashboard` mounts if the driver has
  any Draft trips assigned to them. Lists each (route, vehicle, cargo), with a per-trip **Accept**
  (dispatches it right there, reusing `dispatch/services.py`'s same business rules via
  `api/dispatch.js`) and a single **Not now** to dismiss. Dismissal is session/mount-scoped only —
  navigating away and back (or a fresh login) shows it again, which is what "as soon as the driver
  opens the dashboard" asked for; no persistent "seen" flag was built.
- **Driver-specific KPI tiles**: Pending Requests, Active Trip, Completed Trips — all computed
  client-side by filtering the existing `Trip` list to `trip.driver === user.driver_id`, not new
  backend concepts. Kept within "the limitation" the user named: no invented backend KPIs, just
  different slices of data that already exists.
- **Safety Score meter** — pulled from the driver's own record (`Driver.safety_score`), rendered
  with the same meter component pattern as Fleet Utilization.
- **`DriverTripHistoryChart.jsx`** — a hand-rolled line+area chart, **the correct dataviz form for
  "trend over time"** (single series → line, 1 hue, ~10% opacity area wash, 2px line, 4px+ end dots
  with a surface ring, per-point hover tooltip with a generous hit target, direct label only on the
  most recent point — not every point, per the skill's "label selectively" rule). Data comes from
  `utils/dateBuckets.js`'s `bucketTripsByWeek()`, bucketing this driver's Completed/Cancelled trips
  into the last 8 weeks by `completed_at` (falling back to `dispatched_at`/`created_at`).
- **Enriched mock data**: `mockData.js`'s `mockTrips` grew from 2 to 11 — added 9 historical trips
  for driver 1 (Alex Menon / the `driver_alex` login) spread across mid-May to mid-July so the chart
  has a real, visible trend instead of 1-2 sparse points. User confirmed this was fine before adding.

**Verified**: Playwright end-to-end as the driver login — modal appears on open with the correct
pending trip, dismiss works, **reloading the page re-shows the modal** (confirms "as soon as they
open the dashboard" behavior), Accept dispatches the trip and the KPI tiles update live (Pending
1→0, Active 0→1), chart hover tooltip shows the correct week/count. Zero console errors.

**Not done yet**: Fleet Manager / Safety Officer / Financial Analyst dashboards are still the
generic fleet-wide one — explicitly deferred by the user to a later pass, along with the color
palette review ("let's look about the colors later").

**Bug found (not fixed, out of scope for this pass)**: while testing role switching, discovered
there's no per-route role guard — only nav *links* are hidden per role (`Sidebar.jsx`'s `NAV_LINKS`
filter). `ProtectedRoute` only checks `isAuthenticated`, not role. So a user who lands on a route
their role's nav wouldn't show (e.g. still on `/vehicles` from a previous session, then a different
role logs in without a full page reload) can still render that page. Worth a follow-up: either add
a role check to `ProtectedRoute`/route definitions, or redirect to `/dashboard` on role mismatch.

---

## Role-based accent theming (user-supplied spec)

User provided a fully-specified prompt: 4 roles get distinct accent colors (Fleet Manager `#3B82F6`
blue, Driver `#22C55E` green, Safety Officer `#EC4899` pink, Financial Analyst `#A855F7` purple)
applied everywhere the UI used the primary blue for **identity/chrome** — while the existing
semantic status palette (vehicle/driver/trip states) must stay completely untouched and visually
distinct from the role system.

**Contrast check done before writing any CSS** (per the spec's own checklist item): computed WCAG
contrast ratios for all 4 hexes against the dark surfaces and against white/black text:
- All 4 role hexes pass ≥4.4:1 as **text/icon color** on `--surface` (#1a1a19) — good enough for
  AA on UI-component-sized text; Financial Analyst is the tightest at 4.40.
- **White text on a solid role-accent fill fails badly for some roles** — Driver's green
  (#22C55E) only reaches **2.28:1** with white text, and Fleet Manager/Safety Officer/Financial
  Analyst all land in the 3.5-4.0 range (short of the 4.5:1 text threshold, though they clear 3:1).
  **Black/dark ink (`#0b0b0b`) on the same fills reaches ≥4.97:1 for all four roles.** Decision:
  every role-accent-filled surface (primary buttons, avatar) uses dark ink text, not white —
  necessary to actually meet the spec's own contrast requirement, not just an aesthetic choice.
  Flagged clearly rather than silently deviating from the "solid fill" implication that buttons
  would keep their old white text.

**Architecture**: `ROLE_ACCENT` map + `DEFAULT_ROLE_ACCENT` (pre-login fallback) added to
`constants.js`. `AuthContext.jsx` sets `--role-accent` on `document.documentElement` in a
`useEffect` keyed on `user` — reactive, no reload, confirmed via Playwright by logging in as all 4
roles in one browser session (client-side login/logout only, never `page.goto` between them) and
reading the computed CSS variable each time.

**The fixed semantic blue (`--accent`, `--accent-hover`, `--accent-wash`) was kept completely
separate from `--role-accent`**, not merged — this splits what was previously one overloaded
variable into two systems:
- `--role-accent` (new, reactive): `.btn-primary`, sidebar active nav, `.role-badge` text,
  `.sidebar-avatar` background, input focus rings, generic link color.
- `--accent` (unchanged, fixed): `.status-on_trip`/`.status-dispatched` badges, the driver's own
  trip-history line chart, two decorative (non-role) KPI tile icons, the sidebar brand mark.

**Deliberately left as fixed blue, not switched to role-accent, despite referencing `--accent`**
(reasoning, since the spec's grep-and-replace checklist item could be read as "replace everywhere"):
- **Fleet Status bar chart** — explicitly named in the spec's "must NOT apply" list.
- **`.status-on_trip`/`.status-dispatched` badges** — explicitly protected status colors.
- **Driver trip-history line/area chart** — not named in either list; treated as data-viz territory
  governed by the `dataviz` skill's validated palette, a separate concern from role branding, same
  spirit as protecting the Fleet Status chart.
- **Two KPI tile icons** (Active Vehicles, Drivers On Duty on `FleetDashboard`; Active Trip on
  `DriverDashboard`) — not in the spec's "applies" list either. Switching only these to role-accent
  while the other 4-5 KPI icons keep fixed colors (good/warning/violet/aqua) would produce an
  inconsistent half-themed KPI row where 2 of 6 icons shift per role and the rest don't — judged
  worse than leaving all KPI icons role-independent.
- **Sidebar brand mark** ("T" logo) — not in the spec's list; kept as fixed app-identity blue,
  distinct from the per-user role identity.

**Sidebar active nav treatment**: the spec's own text has slight internal tension — one bullet
offers "background or left-border + text color" as options, while the later "visual treatment
consistency" section buckets "active nav" under text/icon-color (not solid-fill) and explicitly
warns against "a large tinted background area... to avoid the two systems being visually confused."
Resolved by choosing **left-border + text/icon color, no background fill** — sidesteps the tension
entirely and most directly satisfies the anti-confusion warning (a solid-filled active pill would
have looked exactly like the existing status-badge visual language).

**Verified** (Playwright, single browser session, all 4 roles via client-side login/logout, no
`page.goto` between them — proving the reactive update works without a reload):
- `--role-accent` computed value matches the spec's hex exactly for all 4 roles.
- Sidebar active-link text/border, role badge text, avatar background all match per role.
- On the Fleet Manager's Vehicles page: `+ New Vehicle` button background matches role accent;
  the `Available` status badge background and `On Trip` status badge text are **unchanged** (still
  the fixed green-wash/blue, not role accent) — confirms the two systems stay independent.
- Zero console errors across all 4 role switches.
- Found and worked around a test-only confound: logging out and back in as a different role
  doesn't reset the route, so a stale route from the previous role's session interfered with
  sidebar assertions — this is the "no per-route role guard" gap logged above, not a role-accent
  bug.

---

## Dashboard v2: light/dark toggle, Fuel/Expense trend, donut score, truck logo

User asked for four things in one message: (1) a Fuel & Expense trend line chart on the Fleet
Manager and Financial Analyst dashboards, filterable by category; (2) clicking "pending requests"
on the driver dashboard should show the list (it already auto-popped up, but there was no way to
bring it back after dismissing); (3) Safety Score as a pie chart, "more visually appealing"; (4) a
small dark/light theme toggle, top-right, plus the sidebar's "T" logo replaced with a truck outline.

**Item 4 directly reverses an earlier decision** ("the whole theme should be dark," single-theme
architecture, no light mode at all) from the UX Redesign pass above. Rebuilt light-mode support
from scratch rather than just re-adding the old `prefers-color-scheme` media query, since the app
now has a lot more theme surface (role accents, two chart categorical palettes, status badges) that
all needed real light-mode values, not a blind invert.

**Contrast work done before writing CSS** (same discipline as the role-accent task):
- Computed that the **raw role-accent hexes fail badly as text on a light surface** — Driver green
  drops to ~2.1:1, the others ~3.2–3.8:1, all below even the 3:1 UI-component floor. Not just "a bit
  worse than dark mode" — a real accessibility break if shipped as-is.
- Derived **theme-aware, WCAG-safe text variants per role** (`ROLE_ACCENT_TEXT.light`/`.dark` in
  `constants.js`) by programmatically darkening (light mode) or nudging (dark mode) each hex until
  it cleared 4.5:1 against that theme's actual surface color — not eyeballed. `AuthContext` now sets
  both `--role-accent` (raw hex, fills only) and `--role-accent-text` (safe variant, everywhere the
  color touches text/borders directly on the page) reactively on `[user, theme]`.
- `--warning` is deliberately **darkened in light mode only** (`#fab219` → `#8c640e`) — the palette's
  own reference doc admits the raw value is only 1.79:1 on a light surface ("sub-3:1 by design,"
  mitigated there by icon+label pairing). Our status badges are text-only, so left as-is it would
  have been close to unreadable; darkened specifically to hit 4.5:1 as badge text.
- Both chart categorical color sets (Fleet Status's green/blue/amber/red, and the new Fuel/Expense
  chart's aqua/violet/magenta/orange) got **separate light-mode palettes**, run through
  `validate_palette.js --mode light`, not an automatic dark→light flip — per the dataviz skill's
  explicit rule that light and dark are each their own selected/validated step.

**Architecture**: `ThemeContext.jsx` (new) — `theme` state, localStorage-persisted, sets
`data-theme` on `<html>` via `useLayoutEffect` (avoids a flash before paint). `index.css` restructured
so `:root`/`:root[data-theme="dark"]` holds the (unchanged) dark values as the default, and a new
`:root[data-theme="light"]` block overrides every token. `ThemeToggle.jsx` renders fixed top-right on
every route, including the login page (theme is a device preference, not an authenticated one).

**Fuel & Expense Trend chart** (`FuelExpenseTrendChart.jsx`): a multi-series line chart with a
**toggle-to-isolate legend** — chosen over a tab/dropdown switcher because it's the dataviz skill's
own prescribed pattern for "options to view separately" (Tier 0 component: "Legend
(toggle-to-isolate...)"), and it lets categories be compared simultaneously, not just one at a time.
- **Data model note**: "Fuel" is summed from `FuelLog.cost` (the actual fill-up ledger); Maintenance/
  Toll/Operational come from `Expense.category`. Kept as two separate sources rather than merged —
  matches how the rest of the app already treats fuel logging and expense logging as distinct flows
  (separate forms, separate tables on the Fuel & Expenses page). Worth noting this "Maintenance"
  trend line is **Expense records tagged MAINTENANCE**, a different number from the existing
  "Operational Cost per Vehicle" table's maintenance figure (which sums `MaintenanceLog.cost`) — two
  genuinely different things (a ledger entry vs. an actual work-order cost), not a bug, but a real
  pre-existing overlap in the mock data model worth Dev A knowing about if/when this hits a real API.
- Scoped to `FLEET_MANAGER` and `FINANCIAL_ANALYST` only, per the user's explicit ask — `Safety
  Officer` still gets the plain fleet-status dashboard, verified via Playwright (chart count = 0 for
  that role).
- Enriched `mockFuelLogs`/`mockExpenses` (2 → 19 combined records) across ~8 weeks and all 4
  categories so the chart shows a real trend.

**Pending-requests click-to-reopen**: `DriverDashboard` now tracks `showModal` state instead of a
one-way `modalDismissed` flag. Auto-opens once per page-load (via a `useRef` guard, not on every
`load()` re-run — otherwise accepting one of several pending trips would re-trigger the auto-open
loop). The "Pending Requests" KPI tile is now a real `<button>` that reopens the modal on click,
disabled (no-op) when there's nothing pending.

**Safety Score → donut**: dataviz's own guidance is explicit that "a single ratio against a limit"
is a **meter**, not a pie ("Not: A pie of 2 slices" is literally called out in
`choosing-a-form.md`) — flagging this rather than silently overriding it. Implemented anyway since
the user explicitly asked for it, but as a **two-segment donut ring** rather than a flat pie wedge:
avoids the worst pie failure mode (comparing wedge angles) since there's only ever one real segment
to read, and reads closer to the "gauge"/activity-ring style the request was probably going for. Ring
color bands by score (good ≥85, warning ≥65, else critical), same severity logic a meter would use.

**Logo**: sidebar brand mark swapped from a plain "T" to a new hand-drawn `IconTruckLogo` — a
distinct silhouette from the smaller `IconTruck` already used for the "Vehicles" nav row directly
below it, so the two don't read as the same icon repeated twice.

**Verified** (Playwright, single session): theme toggle visible pre-login; Fleet Manager and
Financial Analyst both see the trend chart, Safety Officer doesn't (count 0); legend toggle-to-isolate
actually hides a series; light-mode screenshots confirm status badges stay legible and visually
distinct from role-accent chrome (the original role-accent task's core requirement, re-checked here
since light mode is new surface for that same rule); driver's pending-request modal auto-opens,
dismisses, and **reopens on tile click** listing the correct trip; safety score donut renders with
the right score and color band. Zero console errors across the whole run.

**Not done**: the "Maintenance" trend-line vs. "Operational Cost" table data-model overlap noted
above isn't reconciled — flagged, not fixed, since resolving it means picking one canonical source
for vehicle maintenance cost across the whole app, a bigger decision than this task's scope.

---

## Dashboard v3: role-specific panels, premium chart treatment, distance/hours metric

User's third dashboard-iteration message, all in one go: (1) restyle the trend chart after a
reference image and make it narrower; (2) nudge the theme toggle in from the exact corner; (3) Fleet
Manager — trend chart to the top, Fleet Utilization → pie, a live route status panel beside the
chart with click-for-details; (4) Financial Analyst — trend chart to top, an expense-status
(low/moderate/high) panel beside it; (5) Driver — donut redesign ("looks childish" → "professional
and modern"), replace the trip-history line chart with a distance + hours dual metric card; (6)
Safety Officer — utilization → pie too; (7) apply a full "Apple-inspired" treatment (large KPI,
delta badge, gradient area, hidden Y-axis, hover tooltip, latest-point highlight, entrance
animation) across the above.

**One substitution flagged up front, not silently made**: "live status route map" was requested,
but the data model has no coordinates anywhere — `Trip` only has `origin`/`destination` as city
*names*. A literal pin-on-a-map view isn't buildable without inventing lat/lng data, which would be
fabrication, not a real feature. Built `LiveTripRoutesPanel.jsx` instead: a live (15s-polling),
clickable list of currently-dispatched routes with the same functional behavior asked for — see
what's moving, click a route, get driver + vehicle details in a modal. Explicitly not a map.

**Second substitution, also flagged**: "Trips Over Time" → "total distance travelled" needs a
`distance_km` field the Trip model never had. PRD 3.5 lists "planned distance" as a trip-creation
field that TASKS.md's reference schema omits — same category of gap as License Category and the
Suspended driver status earlier in this doc. Added `distance_km` to `mockTrips` (real approximate
road distances per destination, not arbitrary numbers), to `TripForm.jsx` as a required creation
field, and to the Trips table. "Hours Worked" needed no such addition — it's a genuine derived value
(`hoursWorked()` in `dateBuckets.js`, sums `completed_at - dispatched_at` across a driver's completed
trips), not fabricated.

**Shared `Donut.jsx`** replaces the old `SafetyScoreDonut.jsx` — now used for both Safety Score
(driver) and Fleet Utilization (Fleet Manager, Financial Analyst, Safety Officer all get the same
component via the shared `FleetDashboard.jsx`). "Professional and modern" was interpreted as:
gradient stroke (via SVG `linearGradient`, `useId()`-scoped so multiple donuts on one page don't
collide), thinner rounded-cap ring, tabular-nums center figure, soft drop-shadow, and a genuine
draw-in entrance animation (`stroke-dashoffset` transition from 0% on mount, not a fake CSS loop).
Added a `neutral` color band (fixed accent hue) for Fleet Utilization specifically — the existing
good/warning/critical bands assume "higher is worse," which isn't true for a utilization percentage,
so applying them there would have silently mis-implied a judgment the metric doesn't carry.

**`FuelExpenseTrendChart.jsx` rebuilt** against the reference image's cues (always-visible round
markers on every point, not just on hover — this was the concrete "make it more understandable" ask)
plus the requested Apple-style checklist:
- Delta badge in the header comparing the last two weeks' total spend — **colored inverted from the
  usual convention** (up = red/critical, down = green/good), since for an expense chart a spend
  *increase* is the bad direction, not the good one. Applying the default "up=green" convention here
  would have been a real, misleading bug, not neutral styling.
- Soft per-series gradient area fill (~20% opacity, SVG `linearGradient`, one per category) —
  layering multiple low-opacity washes is an accepted multi-series pattern per the dataviz skill,
  not muddy at this opacity.
- Y-axis stays hidden (unchanged from the original build) — direct labels + hover tooltip already
  carried the values, consistent with "Direct labels before gridlines" from the dataviz skill.
- Latest point on each series gets a larger marker with a `drop-shadow` glow.
- Whole card fades/slides in on mount (`chart-entrance` CSS class, reused across every new chart
  component this pass) — simpler and more robust than measuring per-path length for a stroke
  draw-in animation, while still delivering the "subtle entrance" ask.
- **Legend moved from above the chart to below it**, matching the reference image's layout.
- **Narrower, not full-width**: resolved two ways at once — `.narrow-chart` caps it at 640px, and
  restructuring the dashboard layout so the chart now shares a row with its role-specific side panel
  (`LiveTripRoutesPanel` / `ExpenseStatusCard`) means it was never going to be full-width again
  regardless.

**`ExpenseStatusCard.jsx`** (Financial Analyst only) reuses the *same* `expenseTrend` data already
fetched for the line chart — no extra API call. Classifies the latest week's total against the
trailing average (>1.25× = High, <0.75× = Low, else Moderate) and colors it with the same
good/warning/critical semantics used everywhere else in the app.

**Layout**: `FleetDashboard.jsx` (shared by all three non-driver roles) now conditionally renders a
top `.dashboard-panels` row (trend chart + role-specific panel) only for `FLEET_MANAGER`/
`FINANCIAL_ANALYST`, before the KPI grid; Safety Officer's KPI grid is simply first, unchanged from
before. The Fleet Utilization + Fleet Status row stays last for everyone.

**Verified** (Playwright, dark + light, all 4 roles): trend chart renders narrower with gradient
fills and a correctly-colored (red, since spend rose) delta badge; clicking a live route opens the
detail modal with the right vehicle/driver data; Financial Analyst's Expense Status correctly reads
"High" given the mock data's spend spike; Safety Officer has no trend chart/side panel and a donut
for utilization; driver's dashboard shows the redesigned donut plus a working distance/hours dual
metric card (793 km / 46.3 hrs, both arithmetically verified against the mock data); theme toggle
sits with real margin from the corner. Zero console errors across the whole pass, both themes.

**Not done**: no per-role delta/sparkline was added to the six plain KPI tiles (Active Vehicles,
etc.) — there's no historical series backing those counts (they're point-in-time snapshots), so a
delta there would have had to be fabricated. Only added deltas/trends where genuine historical data
already existed (the expense trend, the safety-score-adjacent metrics).

---

## Change log

- 2026-07-12 — Doc created at contract-lock time, before Hour 1 build starts.
- 2026-07-12 — Hour 1 built and verified (login, JWT storage, protected routes, role-conditional
  app shell, mock API layer). Login email/username conflict resolved: PRD wins.
- 2026-07-12 — Hour 2 built and verified (Vehicle & Driver CRUD, still mock-backed — Dev A's real
  endpoints not confirmed live yet). Found and resolved another PRD/TASKS.md discrepancy: driver
  License Category field.
- 2026-07-12 — Hour 3 built and verified (Trip lifecycle: create/dispatch/complete/cancel, 409
  conflict handling, own-trip scoping for DRIVER role). Still mock-backed.
- 2026-07-12 — Hours 4 through final buffer built in one pass: KPI dashboard + filters, Maintenance
  open/close, Fuel & Expense logging with live operational-cost calc, CSV export, and a full
  end-to-end integration pass. Found and fixed two real bugs during integration testing (reference-
  data-loading race blocking form submission silently; trip complete/cancel not refreshing vehicle/
  driver reference lists). Still entirely mock-backed — swapping to Dev A/B's real endpoints is the
  next concrete step.
- 2026-07-12 — UX redesign: dark theme app-wide (single theme, dataviz-validated palette), top
  navbar replaced with a left sidebar, Dashboard rebuilt with icon KPI tiles, a Fleet Utilization
  meter, and a live Fleet Status bar chart. Requested by user with two inspiration images after the
  functional build was complete.
- 2026-07-12 — Driver-persona dashboard: pending-trip-request popup (Draft trips assigned to the
  driver) with Accept/Dismiss, driver-specific KPI tiles, Safety Score meter, and a trip-history
  line chart. Enriched mock trip data (2 → 11 trips) so the chart has a real trend. Other roles'
  dashboards and the color palette are explicitly deferred to a later pass per the user.
- 2026-07-12 — Role-based accent theming implemented from a user-supplied spec: `--role-accent` CSS
  variable, reactive per logged-in role, applied to primary buttons/sidebar active state/role badge/
  avatar/focus rings, while the fixed semantic status palette stays completely separate. Found and
  fixed a real WCAG contrast gap (white button text failed badly against the Driver green) by
  switching role-accent-filled surfaces to dark ink text. Also found (not fixed, logged above as a
  follow-up) that there's no per-route role guard — only nav links are hidden per role.
- 2026-07-12 — Dashboard v2: light/dark theme toggle (reverses the earlier single-dark-theme
  decision — light mode rebuilt from scratch with its own validated tokens, not a naive invert),
  Fuel & Expense trend chart (Fleet Manager + Financial Analyst only) with a toggle-to-isolate
  legend, Safety Score converted to a donut ring, driver's Pending Requests tile now reopens the
  request modal on click, and the sidebar logo changed from "T" to a truck outline. Found and fixed
  a second WCAG contrast gap: raw role-accent hexes fail badly as text on a light surface (Driver
  green ~2.1:1) — added theme-aware darkened/nudged text variants per role, computed not eyeballed.
- 2026-07-12 — Dashboard v3: role-specific dashboard panels (Live Trip Routes for Fleet Manager,
  Expense Status for Financial Analyst, Fleet Utilization → donut for all three non-driver roles),
  trend chart restyled + moved to top + narrowed, driver's trip-history chart replaced with a
  distance/hours dual metric card, safety score donut redesigned. Two deliberate substitutions
  flagged rather than silently made: no literal map exists (no geo coordinates in the data model —
  built a live route list instead) and `distance_km` was added to the Trip model (PRD 3.5 field
  TASKS.md's schema had omitted, same pattern as License Category and Suspended status earlier).
