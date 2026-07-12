import { useEffect, useId, useState } from "react";

// A ratio-against-a-limit is normally a meter (dataviz skill's own guidance), not a
// pie/donut — flagged since the user explicitly asked for pie charts here (Safety
// Score, Fleet Utilization) "more visually appealing." Built as a ring, not a flat
// pie wedge: avoids pie's worst failure mode (comparing wedge angles) since there's
// only ever one real segment to read, and reads closer to the polished "gauge" look
// that was actually being asked for. Shared by Safety Score (driver) and Fleet
// Utilization (fleet manager / safety officer) so both get the same refined styling.
const SIZE = 168;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function defaultBand(pct) {
  if (pct >= 85) return "good";
  if (pct >= 55) return "warning";
  return "critical";
}

const BAND_VAR = {
  good: "var(--good)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  // Neutral band for metrics where "higher" isn't inherently good or bad (e.g. Fleet
  // Utilization) — a fixed accent color instead of misapplying the good/warning/
  // critical scale to a number that has no such judgment attached.
  neutral: "var(--accent)",
};

export default function Donut({ value, max = 100, suffix = "", band, caption }) {
  const gradientId = useId();
  const pct = Math.max(0, Math.min(1, value / max));
  const [drawn, setDrawn] = useState(false);

  // Entrance animation: render at 0 first, then transition to the real value once
  // mounted, via a CSS transition on stroke-dashoffset (see .donut-arc in index.css).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const resolvedBand = band || defaultBand((value / max) * 100);
  const color = BAND_VAR[resolvedBand];
  const offset = CIRCUMFERENCE * (1 - (drawn ? pct : 0));

  return (
    <div className="donut-wrap">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.65" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--gridline)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="donut-arc"
        />
      </svg>
      <div className="donut-center">
        <div className="donut-value">
          {Math.round(value)}
          <span className="donut-suffix">{suffix}</span>
        </div>
        {caption && <div className="donut-caption">{caption}</div>}
      </div>
    </div>
  );
}
