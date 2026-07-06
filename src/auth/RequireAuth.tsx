import { Navigate, Outlet } from "react-router";
import { useAuth } from "./AuthProvider";
import { FullScreenSpinner } from "@/components/Spinner";

export function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
