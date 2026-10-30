import { LayoutDashboard, FileText, ClipboardList, AlertTriangle, BarChart3 } from 'lucide-react';
import { NavigationItem } from '@/components/layout/NavigationItem';
import type { UserRole } from '@/types';

interface SidebarProps {
  variant: UserRole;
  navigationId?: string;
}

const userNav = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/complaints', label: 'My Complaints', icon: FileText },
  { to: '/track', label: 'Track Complaint', icon: ClipboardList },
  { to: '/notifications', label: 'Notifications', icon: AlertTriangle },
];

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/complaints', label: 'All Complaints', icon: FileText },
  { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/admin/escalations', label: 'Escalations', icon: AlertTriangle },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
];

export function Sidebar({ variant, navigationId }: SidebarProps) {
  const items = variant === 'admin' ? adminNav : userNav;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform lg:translate-x-0 ${
        variant === 'user' ? 'bg-ink-950' : 'bg-white border-r border-ink-100'
      }`}
      aria-label="Primary navigation"
      id={navigationId}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${variant === 'user' ? 'bg-accent-600' : 'bg-ink-900'}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 12l2 2 4-4" />
            <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${variant === 'user' ? 'text-white' : 'text-ink-900'}`}>
            SCMS
          </span>
          <span className={`text-xs ${variant === 'user' ? 'text-ink-300' : 'text-ink-600'}`}>
            Complaint Management
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${variant === 'user' ? 'text-ink-300' : 'text-ink-600'}`}>
          {variant === 'admin' ? 'Administration' : 'Workspace'}
        </p>
        {items.map((item) => (
          <NavigationItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            variant={variant}
          />
        ))}
      </nav>

    </aside>
  );
}
