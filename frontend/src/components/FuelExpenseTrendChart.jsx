import { useId, useMemo, useState } from "react";
import { statusLabel } from "../constants";

const VIEW_W = 100;
const VIEW_H = 36;
const PAD_X = 3;
const TOP_Y = 6;
const BASELINE_Y = 32;

const SERIES = [
  { key: "FUEL", color: "var(--chart-cat2-aqua)" },
  { key: "MAINTENANCE", color: "var(--chart-cat2-violet)" },
  { key: "TOLL", color: "var(--chart-cat2-magenta)" },
  { key: "OPERATIONAL", color: "var(--chart-cat2-orange)" },
];

function currency(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Multi-series trend-over-time line chart, restyled after the user's reference
// image (always-visible round markers on every point, clean minimal gridline,
// legend along the bottom) plus the requested "premium" treatment: a delta badge
// vs the prior period, soft gradient area fills, hidden Y-axis (direct labels +
// tooltip carry the values instead), latest-point emphasis, and a subtle entrance
// animation. Toggle-to-isolate legend kept from the original build — the
// dataviz-recommended way to let categories be "viewed separately."
export default function FuelExpenseTrendChart({ data }) {
  const gradientBase = useId();
  const [hidden, setHidden] = useState(() => new Set());
  const [hoverIndex, setHoverIndex] = useState(null);

  const visible = SERIES.filter((s) => !hidden.has(s.key));
  const n = data.length;
  const maxValue = Math.max(1, ...data.flatMap((row) => visible.map((s) => row[s.key] || 0)));

  const { deltaPct, deltaUp } = useMemo(() => {
    if (n < 2) return { deltaPct: 0, deltaUp: true };
    const totalAt = (i) => visible.reduce((sum, s) => sum + (data[i][s.key] || 0), 0);
    const prev = totalAt(n - 2);
    const curr = totalAt(n - 1);
    if (prev === 0) return { deltaPct: 0, deltaUp: true };
    const pct = ((curr - prev) / prev) * 100;
    return { deltaPct: Math.round(pct), deltaUp: pct >= 0 };
  }, [data, visible, n]);

  function xAt(i) {
    return n > 1 ? PAD_X + (i * (VIEW_W - 2 * PAD_X)) / (n - 1) : VIEW_W / 2;
  }
  function yAt(value) {
    return BASELINE_Y - (value / maxValue) * (BASELINE_Y - TOP_Y);
  }

  function toggleSeries(key) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (visible.length > 1) {
        // Never allow hiding every series — always leave at least one visible.
        next.add(key);
      }
      return next;
    });
  }

  const colWidth = n > 1 ? (VIEW_W - 2 * PAD_X) / (n - 1) : VIEW_W;

  return (
    <div className="chart-card chart-entrance narrow-chart">
      <div className="chart-header-row">
        <div>
          <h2>Fuel &amp; Expense Trend</h2>
          <p className="section-note">Weekly spend by category, last {n} weeks.</p>
        </div>
        {/* Spend rising is not "good" — inverted from the usual up=green convention. */}
        <span className={"delta-badge" + (deltaUp ? " delta-bad" : " delta-good")}>
          {deltaUp ? "↑" : "↓"} {Math.abs(deltaPct)}% vs last week
        </span>
      </div>

      <div className="line-chart multi-line-chart">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="line-chart-svg">
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          <line x1={PAD_X} y1={BASELINE_Y} x2={VIEW_W - PAD_X} y2={BASELINE_Y} className="line-chart-baseline" />
          {hoverIndex !== null && (
            <line
              x1={xAt(hoverIndex)}
              y1={TOP_Y - 2}
              x2={xAt(hoverIndex)}
              y2={BASELINE_Y}
              className="line-chart-crosshair"
            />
          )}

          {visible.map((s) => {
            const linePath = data.map((row, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(row[s.key] || 0)}`).join(" ");
            const areaPath = `${linePath} L ${xAt(n - 1)} ${BASELINE_Y} L ${xAt(0)} ${BASELINE_Y} Z`;
            return (
              <g key={s.key} className="trend-series">
                <path d={areaPath} fill={`url(#${gradientBase}-${s.key})`} stroke="none" />
                <path d={linePath} stroke={s.color} className="multi-line-path" fill="none" />
                {data.map((row, i) => (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(row[s.key] || 0)}
                    r={i === n - 1 ? 1.7 : 1}
                    fill={s.color}
                    className={i === n - 1 ? "trend-point trend-point-latest" : "trend-point"}
                  />
                ))}
              </g>
            );
          })}

          {hoverIndex !== null &&
            visible.map((s) => (
              <circle
                key={s.key}
                cx={xAt(hoverIndex)}
                cy={yAt(data[hoverIndex][s.key] || 0)}
                r={1.9}
                fill={s.color}
                className="line-chart-ring"
              />
            ))}

          {data.map((_, i) => (
            <rect
              key={i}
              x={xAt(i) - colWidth / 2}
              y={0}
              width={colWidth}
              height={VIEW_H}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(i)}
            />
          ))}
        </svg>

        {hoverIndex !== null && (
          <div className="line-chart-tooltip multi-tooltip" style={{ left: `${xAt(hoverIndex)}%` }}>
            <div className="multi-tooltip-label">{data[hoverIndex].label}</div>
            {visible.map((s) => (
              <div className="multi-tooltip-row" key={s.key}>
                <span className="legend-swatch" style={{ background: s.color }} />
                {statusLabel(s.key)}: <strong>{currency(data[hoverIndex][s.key] || 0)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="line-chart-labels">
        {data.map((d, i) => (
          <span key={d.label}>{i === 0 || i === n - 1 || i === Math.floor(n / 2) ? d.label : ""}</span>
        ))}
      </div>

      <div className="legend-row legend-row-bottom">
        {SERIES.map((s) => (
          <button
            type="button"
            key={s.key}
            className={"legend-item" + (hidden.has(s.key) ? " legend-item-off" : "")}
            onClick={() => toggleSeries(s.key)}
          >
            <span className="legend-swatch" style={{ background: s.color }} />
            {statusLabel(s.key)}
          </button>
        ))}
      </div>
    </div>
  );
}
