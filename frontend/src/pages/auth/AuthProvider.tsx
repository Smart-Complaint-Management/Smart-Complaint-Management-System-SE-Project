import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { AuthSession } from "./authContext";

// MOCK SESSION in sessionStorage so a refresh keeps you logged in.
// TODO: replace with a real backend session (e.g. httpOnly cookie). The backend
// must re-check authentication and role on every request, because anything
// stored in the browser can be edited by the user.
const STORAGE_KEY = "scms.session";

function readStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { email, fullName, role } = parsed as Record<string, unknown>;
      if (
        typeof email === "string" &&
        typeof fullName === "string" &&
        (role === "user" || role === "admin")
      ) {
        return { email, fullName, role };
      }
    }
  } catch {
    /* storage unavailable or corrupted: treat as logged out */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);

  const login = useCallback((next: AuthSession) => {
    setSession(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* session lasts until refresh */
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}