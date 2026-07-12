// Two large hero-style figures side by side — the dataviz skill's own stat-tile
// contract (value, semibold, auto-compact) applied to a pair of related metrics
// rather than a chart, since a running total has no meaningful "trend" shape here.
export default function DualMetricCard({ metrics, caption }) {
  return (
    <div className="chart-card">
      <h2>My Activity</h2>
      {caption && <p className="section-note">{caption}</p>}
      <div className="dual-metric-row">
        {metrics.map((m) => (
          <div className="dual-metric" key={m.label}>
            <div className="dual-metric-value">
              {m.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span className="dual-metric-unit">{m.unit}</span>
            </div>
            <div className="dual-metric-label">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
