import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { isAdminRole } from "../../utils/product.js";
import { ErrorState, PageLoader } from "../ui/State.jsx";

export function ProtectedRoute({ roles }) {
  const { user, token, hasHydrated, isRefreshingUser, authError } = useAuthStore();
  const location = useLocation();
  const securitySetupRoute = location.pathname === "/security-setup";
  const agentPendingRoute = location.pathname === "/agent-pending";

  if (!hasHydrated || (token && !user && isRefreshingUser)) return <PageLoader />;
  if (token && !user) {
    console.warn("[route-guard] Token exists but no user is available", { path: location.pathname, authError });
    return <ErrorState message={authError || "Your session could not be loaded. Please sign in again."} onRetry={() => window.location.reload()} />;
  }
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;

  const needsSecuritySetup = user.requiresSecuritySetup || !user.securityRecoveryEnabled;
  if (needsSecuritySetup) {
    if (securitySetupRoute) return <Outlet />;
    console.info("[route-guard] Redirecting user to security setup", {
      path: location.pathname,
      userId: user._id,
      reason: "security_recovery_missing"
    });
    return <Navigate to="/security-setup" replace state={{ from: location }} />;
  }

  const agentNeedsApproval = user.role === "agent" && user.approvalStatus !== "approved";
  if (agentNeedsApproval) {
    if (agentPendingRoute) return <Outlet />;
    console.info("[route-guard] Redirecting agent to approval status", {
      path: location.pathname,
      userId: user._id,
      approvalStatus: user.approvalStatus,
      reason: "agent_approval_required"
    });
    return <Navigate to="/agent-pending" replace state={{ from: location }} />;
  }

  if (securitySetupRoute || agentPendingRoute) return <Navigate to="/app" replace />;

  if (roles?.length && !roles.includes(user.role)) {
    const home = user.role === "customer" ? "/customer" : isAdminRole(user.role) ? "/admin" : `/${user.role}`;
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
