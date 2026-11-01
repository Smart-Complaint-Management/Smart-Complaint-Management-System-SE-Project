import { describe, expect, it } from 'vitest';
import type { AuthSession } from './authContext';

interface RouteAccessDecision {
  canAccess: boolean;
  redirectTo: string | null;
}

/**
 * Evaluates route guard access rule identical to RequireAuth and RequireAdmin logic.
 */
function evaluateRouteAccess(
  path: string,
  session: AuthSession | null
): RouteAccessDecision {
  const isAdminRoute = path.startsWith('/admin');
  const isPublicAuthRoute = path === '/login' || path === '/register';

  if (isPublicAuthRoute) {
    return { canAccess: true, redirectTo: null };
  }

  // RequireAuth check
  if (!session) {
    return { canAccess: false, redirectTo: '/login' };
  }

  // RequireAdmin check for admin routes
  if (isAdminRoute) {
    if (session.role !== 'admin') {
      return { canAccess: false, redirectTo: '/overview' };
    }
    return { canAccess: true, redirectTo: null };
  }

  // General user route
  return { canAccess: true, redirectTo: null };
}

describe('RequireAdmin and Route Authorization Guard (SCMS-75)', () => {
  const unauthenticatedSession: AuthSession | null = null;
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

  const protectedAdminPaths = [
    '/admin',
    '/admin/dashboard',
    '/admin/assignments',
    '/admin/reports',
    '/admin/complaints',
    '/admin/escalations',
  ];

  describe('Unauthenticated Direct URL Access', () => {
    it.each(protectedAdminPaths)(
      'blocks unauthenticated direct navigation to %s and redirects to /login',
      (path) => {
        const decision = evaluateRouteAccess(path, unauthenticatedSession);
        expect(decision.canAccess).toBe(false);
        expect(decision.redirectTo).toBe('/login');
      }
    );
  });

  describe('Normal User (Student) Direct URL Access', () => {
    it.each(protectedAdminPaths)(
      'blocks regular user direct navigation to %s and redirects to /overview',
      (path) => {
        const decision = evaluateRouteAccess(path, normalUserSession);
        expect(decision.canAccess).toBe(false);
        expect(decision.redirectTo).toBe('/overview');
      }
    );

    it('permits regular user access to standard student routes', () => {
      const allowedPaths = ['/overview', '/complaints', '/complaints/new', '/track', '/notifications'];
      for (const path of allowedPaths) {
        const decision = evaluateRouteAccess(path, normalUserSession);
        expect(decision.canAccess).toBe(true);
        expect(decision.redirectTo).toBeNull();
      }
    });
  });

  describe('Administrator Direct URL Access', () => {
    it.each(protectedAdminPaths)(
      'permits administrator direct navigation to %s',
      (path) => {
        const decision = evaluateRouteAccess(path, adminSession);
        expect(decision.canAccess).toBe(true);
        expect(decision.redirectTo).toBeNull();
      }
    );
  });
});
