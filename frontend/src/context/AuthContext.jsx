import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { getAccessToken, getStoredUser, setSession, clearSession } from "../api/tokenStorage";
import { ROLE_ACCENT, ROLE_ACCENT_TEXT, DEFAULT_ROLE_ACCENT, DEFAULT_ROLE_ACCENT_TEXT } from "../constants";
import { useTheme } from "./ThemeContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  // Single source of truth for role-based theming: --role-accent (fills: buttons,
  // avatar) and --role-accent-text (text/border on the page surface — a darkened/
  // nudged per-role, per-theme variant, since the raw hexes fail WCAG contrast as
  // text on their own, especially the Driver green on a light surface). Reactive
  // on both the logged-in user's role AND the current theme — no reload needed.
  useEffect(() => {
    const fill = (user && ROLE_ACCENT[user.role]) || DEFAULT_ROLE_ACCENT;
    const text = (user && ROLE_ACCENT_TEXT[theme][user.role]) || DEFAULT_ROLE_ACCENT_TEXT[theme];
    document.documentElement.style.setProperty("--role-accent", fill);
    document.documentElement.style.setProperty("--role-accent-text", text);
  }, [user, theme]);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      setLoading(false);
      return;
    }
    authApi
      .me(access)
      .then(({ user: freshUser }) => {
        setUser(freshUser);
        setSession({ user: freshUser });
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    setError(null);
    const { access, refresh } = await authApi.login({ email, password });
    // Store the token before calling me() -- apiFetch reads the token from
    // storage, not from the parameter passed here, so me() would otherwise
    // send an unauthenticated request and get a 401 on the very first login.
    setSession({ access, refresh });
    const { user: freshUser } = await authApi.me(access);
    setSession({ access, refresh, user: freshUser });
    setUser(freshUser);
    return freshUser;
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    error,
    setError,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
