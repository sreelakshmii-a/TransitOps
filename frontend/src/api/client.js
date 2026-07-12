import { getAccessToken, clearSession } from "./tokenStorage";

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Fake latency so mock-backed UI behaves like it's really hitting a network.
export const MOCK_DELAY_MS = 300;

export function mockDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

// Normalized error shape for both real DRF errors and mock errors.
// - 409 conflicts: { status: 409, reason, code }  (frozen contract)
// - other DRF errors: { status, detail } or { status, fieldErrors: {...} }
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.reason || body?.detail || "Request failed");
    this.status = status;
    this.reason = body?.reason;
    this.code = body?.code;
    this.detail = body?.detail;
    this.fieldErrors = body && !body.reason && !body.detail ? body : undefined;
  }
}

export function mockError(status, body) {
  return mockDelay(undefined).then(() => {
    throw new ApiError(status, body);
  });
}

// path is relative to API_BASE_URL, e.g. "/vehicles/"
export async function apiFetch(path, { method = "GET", body, params } = {}) {
  const url = new URL(API_BASE_URL.replace(/\/$/, "") + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = { "Content-Type": "application/json" };
  const access = getAccessToken();
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearSession();
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload;
}
