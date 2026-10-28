import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar, RoleSwitcher } from '@/components/layout/Topbar';
import { useRole } from '@/context/RoleContext';

interface ApplicationShellProps {
  children?: ReactNode;
}

export function ApplicationShell({ children }: ApplicationShellProps) {
  const { user } = useRole();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar variant={user.role} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="relative h-full">
            <Sidebar variant={user.role} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:pl-64">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Demo role switcher */}
      <RoleSwitcher />
    </div>
  );
}
