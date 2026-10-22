import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface NavigationItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  variant: 'user' | 'admin';
  end?: boolean;
}

export function NavigationItem({ to, label, icon: Icon, variant, end }: NavigationItemProps) {
  const defaultClass = variant === 'user' ? 'nav-item nav-item-default' : 'nav-item nav-item-admin';
  const activeClass = variant === 'user' ? 'nav-item nav-item-active' : 'nav-item nav-item-admin-active';

  return (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? activeClass : defaultClass)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}
