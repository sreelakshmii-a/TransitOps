// Small dependency-free line icons (24x24, stroke-based). Hand-drawn rather than
// pulling an icon library mid-build — keeps the bundle light and install-free.
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconDashboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconTruck(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6.5" width="11" height="9" rx="1.2" />
      <path d="M13.5 10h3.6l3.4 3.4v2.1h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.8 14.2c2.2.3 3.7 2 3.7 4.3" />
    </svg>
  );
}

export function IconRoute(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="5.5" cy="18.5" r="2" />
      <circle cx="18.5" cy="5.5" r="2" />
      <path d="M5.5 16.5V13a4 4 0 0 1 4-4h5a4 4 0 0 0 4-4" strokeDasharray="2.5 3" />
    </svg>
  );
}

export function IconWrench(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.8L3.5 16.9l2.6 2.6 5.8-5.8a4 4 0 0 0 4.8-5.4l-2.6 2.6-2-2z" />
    </svg>
  );
}

export function IconFuel(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="9" height="15" rx="1.2" />
      <path d="M6 9h3.5" />
      <path d="M12.5 9.5 16 12v5a1.6 1.6 0 0 0 3.2 0V9.8a1.6 1.6 0 0 0-.47-1.13L16.5 6.5" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
      <path d="M14 15.5 19 12l-5-3.5" />
      <path d="M19 12H9" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3 11 14.8l4.5-5.6" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconSun(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function IconMoon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
    </svg>
  );
}

// A slightly more refined, logo-scaled truck silhouette — distinct from the
// smaller IconTruck used for the "Vehicles" nav item, so the brand mark and the
// nav row right below it don't read as the same icon repeated twice.
export function IconTruckLogo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 7.5h10.5v8H2.5z" />
      <path d="M13 10.2h3.3l3.2 3v2.3H13z" />
      <circle cx="6.7" cy="17.3" r="1.9" />
      <circle cx="16.8" cy="17.3" r="1.9" />
      <path d="M2.5 10.2h4" />
    </svg>
  );
}
