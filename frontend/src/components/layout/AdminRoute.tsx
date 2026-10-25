
import { Navigate, Outlet } from 'react-router-dom';
import { useRole } from '@/context/RoleContext';

export function AdminRoute() {
  const { user } = useRole();

  if (user.role !== 'admin') {
    return <Navigate to="/overview" replace />;
  }

  return <Outlet />;
}
