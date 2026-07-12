const CATEGORIES = ["FUEL", "MAINTENANCE", "TOLL", "OPERATIONAL"];

function weekTotal(row) {
  return CATEGORIES.reduce((sum, c) => sum + (row[c] || 0), 0);
}

function classify(current, average) {
  if (average === 0) return "MODERATE";
  const ratio = current / average;
  if (ratio >= 1.25) return "HIGH";
  if (ratio <= 0.75) return "LOW";
  return "MODERATE";
}

const STATUS_META = {
  LOW: { label: "Low", note: "Spending is running below average — good cost control.", tone: "good" },
  MODERATE: { label: "Moderate", note: "Spending is close to the recent average.", tone: "warning" },
  HIGH: { label: "High", note: "Spending is well above the recent average — worth a look.", tone: "critical" },
};

function currency(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Reuses the same weekly trend data already fetched for the line chart — no
// separate API call. Classifies the most recent week's total spend against the
// trailing average so "is this a lot?" has an actual answer, not just a number.
export default function ExpenseStatusCard({ data }) {
  const totals = data.map(weekTotal);
  const current = totals[totals.length - 1] || 0;
  const average = totals.length > 1 ? totals.slice(0, -1).reduce((a, b) => a + b, 0) / (totals.length - 1) : current;
  const status = classify(current, average);
  const meta = STATUS_META[status];
  const deltaPct = average > 0 ? Math.round(((current - average) / average) * 100) : 0;

  return (
    <div className="chart-card chart-entrance">
      <h2>Expense Status</h2>
      <p className="section-note">This week&apos;s spend vs the {totals.length - 1}-week average.</p>

      <div className={"status-hero status-hero-" + meta.tone}>{meta.label}</div>

      <div className="dual-metric-row" style={{ marginTop: 20 }}>
        <div className="dual-metric">
          <div className="dual-metric-value">
            {currency(current)}
            <span className="dual-metric-unit">this week</span>
          </div>
        </div>
        <div className="dual-metric">
          <div className="dual-metric-value">
            {currency(Math.round(average))}
            <span className="dual-metric-unit">avg/week</span>
          </div>
        </div>
      </div>

      <p className="section-note" style={{ marginTop: 16, textAlign: "center" }}>
        {deltaPct >= 0 ? "+" : ""}
        {deltaPct}% vs average — {meta.note}
      </p>
    </div>
  );
}
