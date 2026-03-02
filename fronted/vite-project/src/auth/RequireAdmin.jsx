import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAdmin({ children }) {
  const { hydrated, isAuthenticated, role } = useAuth();

  if (!hydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}

