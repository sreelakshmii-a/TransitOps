function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday-based week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const SHORT_DATE = { day: "numeric", month: "short" };

// Sum of dispatched_at -> completed_at duration, in hours, across trips that have
// both timestamps. Real derived data (not fabricated) — used for the driver
// dashboard's "Hours Worked" metric.
export function hoursWorked(trips) {
  const totalMs = trips.reduce((sum, t) => {
    if (!t.dispatched_at || !t.completed_at) return sum;
    return sum + (new Date(t.completed_at) - new Date(t.dispatched_at));
  }, 0);
  return Math.round((totalMs / 3600000) * 10) / 10;
}

function weekWindows(weeksBack) {
  const thisWeekStart = startOfWeek(new Date());
  return Array.from({ length: weeksBack }, (_, i) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - (weeksBack - 1 - i) * 7);
    return start;
  });
}

// Multi-series version of bucketTripsByWeek: sums `amount` per `category` per week.
// `records` is a flat, already-normalized list of { date, category, amount } — the
// caller merges whatever source tables it needs (e.g. FuelLogs + Expenses) before
// calling this, so the bucketing logic stays source-agnostic.
export function bucketAmountsByWeek(records, categories, weeksBack = 8) {
  const starts = weekWindows(weeksBack);
  const buckets = starts.map((start) => {
    const row = { label: start.toLocaleDateString(undefined, SHORT_DATE) };
    categories.forEach((c) => (row[c] = 0));
    return { start, row };
  });

  records.forEach(({ date, category, amount }) => {
    if (!date || !categories.includes(category)) return;
    const d = new Date(date);
    const bucket = buckets.find((b) => {
      const end = new Date(b.start);
      end.setDate(end.getDate() + 7);
      return d >= b.start && d < end;
    });
    if (bucket) bucket.row[category] += amount;
  });

  return buckets.map((b) => b.row);
}
