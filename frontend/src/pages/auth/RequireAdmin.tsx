import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext';

export function RequireAdmin() {
  const { session } = useAuth();
  return session?.role === 'admin' ? <Outlet /> : <Navigate to="/overview" replace />;
}
