import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { AuthSession } from "./authContext";
import { fetchCurrentUser, logoutRequest } from '@/services/authApi';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then((user) => setSession(user ? { email: user.email, fullName: user.fullName, role: user.role } : null))
      .catch(() => setSession(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback((next: AuthSession) => {
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    void logoutRequest().catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ session, loading, login, logout }), [session, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
