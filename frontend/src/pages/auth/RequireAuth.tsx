import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center">Checking your session…</div>;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
