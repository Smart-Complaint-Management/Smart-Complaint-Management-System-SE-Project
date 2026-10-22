// Role context for the Smart Complaint Management System.
//
// This is a DEVELOPMENT-ONLY role switcher. It is NOT authentication. It exists
// so the team can preview the User and Administrator layouts during frontend
// development. Real authentication and authorization enforcement will be
// handled by the Flask backend in a future task.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CurrentUser, UserRole } from '@/types';

interface RoleContextValue {
  user: CurrentUser;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const usersByRole: Record<UserRole, CurrentUser> = {
  user: {
    name: 'Shreya Shenoy',
    role: 'user',
    email: 'shreya.shenoy@university.edu',
  },
  admin: {
    name: 'Dr. Hassan Malik',
    role: 'admin',
    email: 'hassan.malik@university.edu',
  },
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(usersByRole.user);

  const setRole = useCallback((role: UserRole) => {
    setUser(usersByRole[role]);
  }, []);

  const value = useMemo(() => ({ user, setRole }), [user, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
