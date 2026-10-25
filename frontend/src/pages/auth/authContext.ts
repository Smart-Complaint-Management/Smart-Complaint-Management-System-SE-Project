import { createContext, useContext } from "react";
import type { UserRole } from "@/types";

export interface AuthSession {
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthContextValue {
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}