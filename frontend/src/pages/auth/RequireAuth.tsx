import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}