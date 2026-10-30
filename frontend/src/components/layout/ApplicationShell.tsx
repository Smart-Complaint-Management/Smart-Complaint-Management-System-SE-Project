import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useAuth } from '@/pages/auth/authContext';

interface ApplicationShellProps {
  children?: ReactNode;
}

export function ApplicationShell({ children }: ApplicationShellProps) {
  const { session } = useAuth();
  const role = session?.role ?? 'user';
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  const hadOpenSidebar = useRef(false);

  useEffect(() => {
    if (!sidebarOpen) {
      if (hadOpenSidebar.current) menuButtonRef.current?.focus();
      hadOpenSidebar.current = false;
      return;
    }
    hadOpenSidebar.current = true;
    mobileSidebarRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
      if (event.key === 'Tab' && mobileSidebarRef.current) {
        const focusable = [...mobileSidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar variant={role} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div ref={mobileSidebarRef} role="dialog" aria-modal="true" aria-label="Navigation menu" className="relative h-full">
            <Sidebar variant={role} navigationId="mobile-primary-navigation" />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:pl-64">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} menuButtonRef={menuButtonRef} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Demo role switcher */}
    </div>
  );
}
