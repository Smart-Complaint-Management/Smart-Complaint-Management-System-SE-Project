import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export function RequireAuth() {
  const { session, loading, initializationError, retryInitialization } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center">Checking your session…</div>;
  if (initializationError) return <div role="alert" className="mx-auto mt-12 max-w-md card p-6 text-center"><p className="text-sm text-rose-700">{initializationError}</p><button type="button" className="btn btn-secondary mt-4" onClick={retryInitialization}>Try again</button></div>;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
