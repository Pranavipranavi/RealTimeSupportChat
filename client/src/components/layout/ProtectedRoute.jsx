import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export function ProtectedRoute({ roles }) {
  const { user, token } = useAuthStore();
  const location = useLocation();
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles?.length && !roles.includes(user.role)) return <Navigate to={`/${user.role === "customer" ? "customer" : user.role}`} replace />;
  return <Outlet />;
}
