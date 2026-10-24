import { useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "./authContext";

// Keeps the dev RoleContext in step with the logged-in role, including after a
// page refresh. Renders nothing. Uses RoleContext's public API only.
export function RoleSync() {
  const { session } = useAuth();
  const { setRole } = useRole();

  useEffect(() => {
    if (session) setRole(session.role);
  }, [session, setRole]);

  return null;
}