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
- [ ] Vehicle list/create/edit forms → `/api/vehicles/`
- [ ] Driver list/create/edit forms → `/api/drivers/`
- [ ] Commit: `feat(ui): vehicle/driver CRUD screens`

**Status:** not started
**Notes:**

### Hour 3 (12:00–1:00) — Trip lifecycle + role-based UI
- [ ] Trip creation form + list
- [ ] Dispatch button, surfaces `reason` on 409
- [ ] Complete / Cancel actions
- [ ] Hide nav links / disable actions per `user.role`
- [ ] Commit: `feat(ui): trip lifecycle screens + role-based UI`

**Status:** not started
**Notes:**

### Hard checkpoint — 1:00pm
Dispatch lock + trip lifecycle must be merged & passing concurrency test. If not, backend falls
back to `.filter().update()` — no frontend impact expected (same response contract).

### Hour 4 (1:00–2:00) — KPI dashboard skeleton
- [ ] `GET /api/dashboard/kpis/` wired to six KPI tiles, live queries, visible refresh
- [ ] Commit: `feat(dashboard): KPI tiles wired to live queries`

**Status:** not started
**Notes:**

### Hour 5 (2:00–3:00) — Maintenance/fuel UI + filters
- [ ] Maintenance open/close UI
- [ ] Fuel log + expense logging forms
- [ ] Dashboard filters (vehicle type, status, region) wired to query params
- [ ] Commit: `feat(ui): maintenance + fuel logging screens + dashboard filters`

**Status:** not started
**Notes:**

### Feature freeze — 3:00pm
Cut Bonus items (charts, PDF export, email reminders, vehicle docs, search, dark mode) if not
already done. Zero deliverable cost.

### Hour 6 (3:00–4:00) — Integration/bugfix only
- [ ] Cross-test flows end to end against Dev B's seed data
- [ ] Commit: `fix: UI bugs from integration pass`

**Status:** not started
**Notes:**

### Hour 6.5–7 (4:00–4:30) — Hardening / stretch
- [ ] If ahead: CSV export UI (`/api/reports/csv/?type=trips|fuel|expenses`)
- [ ] Otherwise: bugfix only, no new scope

**Status:** not started
**Notes:**

### Final buffer (4:30–5:00) — sacred, no feature work
- [ ] Confirm full flow works against a clean migrate + reseed
- [ ] No commits except seed/demo script

**Status:** not started
**Notes:**

---

## Change log

- 2026-07-12 — Doc created at contract-lock time, before Hour 1 build starts.
- 2026-07-12 — Hour 1 built and verified (login, JWT storage, protected routes, role-conditional
  app shell, mock API layer). Login email/username conflict resolved: PRD wins.
