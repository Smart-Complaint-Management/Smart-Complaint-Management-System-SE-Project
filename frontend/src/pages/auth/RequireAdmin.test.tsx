import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { RequireAdmin } from './RequireAdmin';
import { AuthContext, type AuthContextValue, type AuthSession } from './authContext';

describe('RequireAuth, RequireAdmin and Route Configuration (SCMS-75)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  const normalUserSession: AuthSession = {
    email: 'shreya@university.edu',
    fullName: 'Shreya Shenoy',
    role: 'user',
  };

  const adminSession: AuthSession = {
    email: 'malik@university.edu',
    fullName: 'Dr. Hassan Malik',
    role: 'admin',
  };

  function createAuthContextValue(session: AuthSession | null): AuthContextValue {
    return {
      session,
      loading: false,
      initializationError: '',
      retryInitialization: () => {},
      login: () => {},
      logout: () => {},
    };
  }

  /**
   * Mounts the exact route structure used by the application in App.tsx.
   */
  function renderAppRoutes(initialPath: string, session: AuthSession | null) {
    const authValue = createAuthContextValue(session);

    act(() => {
      root!.render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<div data-testid="login-view">Login Page</div>} />
              <Route path="/register" element={<div data-testid="register-view">Register Page</div>} />

              {/* Protected user and admin routes requiring authentication */}
              <Route element={<RequireAuth />}>
                <Route path="/overview" element={<div data-testid="overview-view">User Overview Page</div>} />
                <Route path="/complaints" element={<div data-testid="complaints-view">User Complaints Page</div>} />
                <Route path="/track" element={<div data-testid="track-view">Track Page</div>} />

                {/* Protected administrator routes requiring administrator role */}
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/admin/dashboard" element={<div data-testid="admin-dashboard-view">Admin Dashboard View</div>} />
                  <Route path="/admin/assignments" element={<div data-testid="admin-assignments-view">Admin Assignments View</div>} />
                  <Route path="/admin/reports" element={<div data-testid="admin-reports-view">Admin Reports View</div>} />
                  <Route path="/admin/complaints" element={<div data-testid="admin-complaints-view">Admin All Complaints View</div>} />
                  <Route path="/admin/escalations" element={<div data-testid="admin-escalations-view">Admin Escalations View</div>} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });
  }

  const protectedAdminPaths = [
    '/admin/dashboard',
    '/admin/assignments',
    '/admin/reports',
    '/admin/complaints',
    '/admin/escalations',
  ];

  describe('Unauthenticated Direct URL Navigation', () => {
    it.each(protectedAdminPaths)(
      'intercepts unauthenticated direct navigation to %s and redirects to /login',
      (path) => {
        renderAppRoutes(path, null);
        expect(container?.querySelector('[data-testid="login-view"]')).not.toBeNull();
        expect(container?.textContent).toContain('Login Page');
        // Admin content must never be rendered
        expect(container?.textContent).not.toContain('Admin');
      }
    );
  });

  describe('Normal User (Student) Direct URL Navigation', () => {
    it.each(protectedAdminPaths)(
      'blocks regular user direct navigation to %s and redirects to /overview',
      (path) => {
        renderAppRoutes(path, normalUserSession);
        expect(container?.querySelector('[data-testid="overview-view"]')).not.toBeNull();
        expect(container?.textContent).toContain('User Overview Page');
        // Admin content must never be rendered
        expect(container?.textContent).not.toContain('Admin');
      }
    );

    it('permits regular user access to /complaints', () => {
      renderAppRoutes('/complaints', normalUserSession);
      expect(container?.querySelector('[data-testid="complaints-view"]')).not.toBeNull();
    });

    it('permits regular user access to /track', () => {
      renderAppRoutes('/track', normalUserSession);
      expect(container?.querySelector('[data-testid="track-view"]')).not.toBeNull();
    });
  });

  describe('Administrator Direct URL Navigation', () => {
    it.each(protectedAdminPaths)(
      'permits authenticated administrator direct navigation to %s',
      (path) => {
        renderAppRoutes(path, adminSession);
        expect(container?.textContent).toContain('Admin');
        expect(container?.querySelector('[data-testid="login-view"]')).toBeNull();
      }
    );

    it('redirects /admin to /admin/dashboard for administrators', () => {
      renderAppRoutes('/admin', adminSession);
      expect(container?.querySelector('[data-testid="admin-dashboard-view"]')).not.toBeNull();
      expect(container?.textContent).toContain('Admin Dashboard View');
    });
  });
});
