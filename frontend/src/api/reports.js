import { API_BASE_URL, USE_MOCKS } from "./client";
import { getAccessToken } from "./tokenStorage";
import { mockTrips, mockFuelLogs, mockExpenses } from "./mockData";

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  return lines.join("\n");
}

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const MOCK_ROWS = {
  trips: () => mockTrips,
  fuel: () => mockFuelLogs,
  expenses: () => mockExpenses,
};

// Cut-down "Reports" per TASKS.md's cutline: raw CSV export only, no charts/ratios.
export async function downloadReportCsv(type) {
  if (USE_MOCKS) {
    const csv = toCsv(MOCK_ROWS[type]());
    triggerDownload(`${type}.csv`, csv, "text/csv");
    return;
  }
  const url = `${API_BASE_URL.replace(/\/$/, "")}/reports/csv/?type=${type}`;
  const access = getAccessToken();
  const response = await fetch(url, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!response.ok) throw new Error("Failed to export CSV.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${type}.csv`;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
