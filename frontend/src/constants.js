// Status enums — mirror the backend's choices classes (VehicleStatus, DriverStatus).
// Per IMPLEMENTATION.md: PRD wins on conflicts, so DriverStatus includes SUSPENDED
// even though TASKS.md's reference schema omits it — flagged for Dev A to add.

export const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

export const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];

export const TRIP_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"];

// Dispatch 409 `reason` -> human-readable message. Frozen contract: {"reason": str, "code": str}.
export const DISPATCH_REASON_MESSAGES = {
  vehicle_unavailable: "This vehicle is no longer available.",
  driver_unavailable: "This driver is no longer available.",
  license_expired: "This driver's license has expired.",
  cargo_exceeds_capacity: "Cargo weight exceeds the vehicle's capacity.",
};

// Role -> accent color, the single source of truth for role-based UI theming
// (sidebar active state, primary buttons, role badge, avatar, focus rings).
// Deliberately separate from the fixed semantic status palette in index.css
// (--accent etc.) — those color vehicle/driver/trip states and must never move
// with the logged-in user's role. DEFAULT_ROLE_ACCENT is what's applied when no
// user is logged in yet (e.g. the login page's Sign In button).
export const ROLE_ACCENT = {
  FLEET_MANAGER: "#3B82F6",
  DRIVER: "#22C55E",
  SAFETY_OFFICER: "#EC4899",
  FINANCIAL_ANALYST: "#A855F7",
};

export const DEFAULT_ROLE_ACCENT = "#3987e5";

// The raw role hexes above fail WCAG AA (some badly — Driver green ~2:1) when used
// directly as small TEXT/icon color on a light surface, and are borderline on dark.
// These are darkened (light) / nudged (dark) per-role variants that hold >=4.5:1
// against each theme's actual surface — computed once, not eyeballed. Used for
// active-nav text+border, role badge text, and the generic link color; the raw
// ROLE_ACCENT hex is still used as-is for solid fills (buttons, avatar) where dark
// ink text sits on top instead, a different contrast pair entirely.
export const ROLE_ACCENT_TEXT = {
  dark: {
    FLEET_MANAGER: "#3b82f6",
    DRIVER: "#22c55e",
    SAFETY_OFFICER: "#ec4899",
    FINANCIAL_ANALYST: "#aa58f7",
  },
  light: {
    FLEET_MANAGER: "#3472d8",
    DRIVER: "#178640",
    SAFETY_OFFICER: "#c63c81",
    FINANCIAL_ANALYST: "#974dde",
  },
};

export const DEFAULT_ROLE_ACCENT_TEXT = { dark: "#3987e5", light: "#256abf" };

export function statusLabel(status) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
