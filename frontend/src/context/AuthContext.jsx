import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { getAccessToken, getStoredUser, setSession, clearSession } from "../api/tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
