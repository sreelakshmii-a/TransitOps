import { apiFetch, USE_MOCKS, mockDelay, mockError } from "./client";
import { mockUsers } from "./mockData";

// NOTE: PRD 3.1 mandates email+password login. TASKS.md's contract literally says
// { username, password } — per project decision, PRD wins. Backend (/api/auth/login/)
// needs to accept `email`, not `username`. Flag this to Dev A at the 11:00 checkpoint.

export async function login({ email, password }) {
  if (USE_MOCKS) {
    const match = mockUsers.find((u) => u.email === email && u.password === password);
    if (!match) {
      return mockError(401, { reason: "invalid_credentials", code: "INVALID_CREDENTIALS" });
    }
    return mockDelay({ access: `mock-access-${match.id}`, refresh: `mock-refresh-${match.id}` });
  }
  return apiFetch("/auth/login/", { method: "POST", body: { email, password } });
}

export async function register({ username, email, password, role }) {
  if (USE_MOCKS) {
    const exists = mockUsers.some((u) => u.email === email || u.username === username);
    if (exists) {
      return mockError(400, { detail: "A user with that username or email already exists." });
    }
    const newUser = { id: mockUsers.length + 1, username, email, password, role };
    mockUsers.push(newUser);
    const { password: _password, ...user } = newUser;
    return mockDelay({ user });
  }
  return apiFetch("/auth/register/", { method: "POST", body: { username, email, password, role } });
}

export async function me(accessToken) {
  if (USE_MOCKS) {
    const id = Number(String(accessToken).replace("mock-access-", ""));
    const match = mockUsers.find((u) => u.id === id);
    if (!match) return mockError(401, { reason: "invalid_token", code: "INVALID_TOKEN" });
    const { password: _password, ...user } = match;
    return mockDelay({ user });
  }
  return apiFetch("/auth/me/");
}
