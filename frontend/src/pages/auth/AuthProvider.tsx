import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { AuthSession } from "./authContext";
import { fetchCurrentUser, logoutRequest } from '@/services/authApi';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setInitializationError('');
    fetchCurrentUser().then((user) => {
      if (active) setSession(user ? { email: user.email, fullName: user.fullName, role: user.role } : null);
    }).catch((error: unknown) => {
      if (!active) return;
      const status = (error as { status?: number }).status;
      if (status === 401) setSession(null);
      else setInitializationError(error instanceof Error ? error.message : 'Could not check your session.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);

  const login = useCallback((next: AuthSession) => {
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    void logoutRequest().catch(() => undefined);
  }, []);

  const retryInitialization = useCallback(() => setRetryKey((key) => key + 1), []);

  const value = useMemo(() => ({ session, loading, initializationError, retryInitialization, login, logout }), [session, loading, initializationError, retryInitialization, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
