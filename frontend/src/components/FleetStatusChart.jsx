import { statusLabel } from "../constants";

// CSS vars, not hardcoded hex — validated separately per theme (validate_palette.js,
// --mode dark and --mode light) and defined in index.css's two data-theme blocks, so
// the chart re-themes with the light/dark toggle instead of needing a JS branch here.
const STATUS_COLOR = {
  AVAILABLE: "var(--chart-cat-green)",
  ON_TRIP: "var(--chart-cat-blue)",
  IN_SHOP: "var(--chart-cat-amber)",
  RETIRED: "var(--chart-cat-red)",
};

export default function FleetStatusChart({ data }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="chart-card">
      <h2>Fleet Status</h2>
      <p className="section-note">Vehicles by status, live from the current filters.</p>
      <div className="bar-chart">
        {data.map((d) => (
          <div className="bar-chart-col" key={d.status} tabIndex={0}>
            <div className="bar-chart-tooltip">
              {statusLabel(d.status)}: <strong>{d.count}</strong>
            </div>
            <span className="bar-chart-value">{d.count}</span>
            <div
              className="bar-chart-bar"
              style={{
                height: `${(d.count / maxCount) * 100}%`,
                background: STATUS_COLOR[d.status],
              }}
            />
          </div>
        ))}
      </div>
      <div className="bar-chart-labels">
        {data.map((d) => (
          <span key={d.status}>{statusLabel(d.status)}</span>
        ))}
      </div>
    </div>
  );
}
