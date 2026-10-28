import { Bell, Menu, X, User as UserIcon, Shield } from 'lucide-react';
import { useRole } from '@/context/RoleContext';

interface TopbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function Topbar({ onToggleSidebar, sidebarOpen }: TopbarProps) {
  const { user } = useRole();
  const isAdmin = user.role === 'admin';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-surface-card/95 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 lg:hidden"
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Page context */}
      <div className="flex items-center gap-2 text-sm text-ink-400">
        <span className="hidden font-medium sm:inline">
          {isAdmin ? 'Administrator' : 'User'}
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="font-medium text-ink-600">Smart Complaint Management</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications bell */}
        <button
          className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-white" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isAdmin ? 'bg-ink-900' : 'bg-accent-600'} text-sm font-semibold text-white`}>
            {user.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-medium text-ink-800">{user.name}</span>
            <span className="flex items-center gap-1 text-[11px] text-ink-400">
              {isAdmin ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
              {isAdmin ? 'Administrator' : 'Student'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function RoleSwitcher() {
  const { user, setRole } = useRole();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-2 shadow-card-hover lg:bottom-6 lg:right-6">
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Demo:</span>
      <div className="flex items-center rounded-full bg-ink-50 p-0.5">
        <button
          onClick={() => setRole('user')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            user.role === 'user' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          User
        </button>
        <button
          onClick={() => setRole('admin')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            user.role === 'admin' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );
}
