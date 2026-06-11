import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./api/client.js";
import { AppShell } from "./components/layout/AppShell.jsx";
import { ProtectedRoute } from "./components/layout/ProtectedRoute.jsx";
import { RouteErrorBoundary } from "./components/layout/RouteErrorBoundary.jsx";
import { PageLoader } from "./components/ui/State.jsx";
import { ToastHost } from "./components/ui/ToastHost.jsx";
import { useAuthStore } from "./store/authStore.js";
import { useUiStore } from "./store/uiStore.js";
import { isAdminRole, PRODUCT_NAME } from "./utils/product.js";

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx").then((module) => ({ default: module.AdminDashboard })));
const AdminConversations = lazy(() => import("./pages/admin/AdminConversations.jsx").then((module) => ({ default: module.AdminConversations })));
const UserManagement = lazy(() => import("./pages/admin/UserManagement.jsx").then((module) => ({ default: module.UserManagement })));
const AgentPendingPage = lazy(() => import("./pages/AgentPendingPage.jsx").then((module) => ({ default: module.AgentPendingPage })));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard.jsx").then((module) => ({ default: module.AgentDashboard })));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx").then((module) => ({ default: module.AuthPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx").then((module) => ({ default: module.ForgotPasswordPage })));
const ChatPage = lazy(() => import("./pages/customer/ChatPage.jsx").then((module) => ({ default: module.ChatPage })));
const CustomerDashboard = lazy(() => import("./pages/customer/CustomerDashboard.jsx").then((module) => ({ default: module.CustomerDashboard })));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx").then((module) => ({ default: module.LandingPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx").then((module) => ({ default: module.ProfilePage })));
const SecuritySetupPage = lazy(() => import("./pages/SecuritySetupPage.jsx").then((module) => ({ default: module.SecuritySetupPage })));

function RoleRedirect() {
  const { user, token, hasHydrated, isRefreshingUser } = useAuthStore();
  if (!hasHydrated || (token && !user && isRefreshingUser)) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.requiresSecuritySetup || !user.securityRecoveryEnabled) return <Navigate to="/security-setup" replace />;
  if (user.role === "agent" && user.approvalStatus !== "approved") return <Navigate to="/agent-pending" replace />;
  if (isAdminRole(user.role)) return <Navigate to="/admin" replace />;
  if (user.role === "agent") return <Navigate to="/agent" replace />;
  return <Navigate to="/customer" replace />;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
      >
        <Suspense fallback={<PageLoader />}>
          <RouteErrorBoundary resetKey={location.pathname}>
            <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ForgotPasswordPage />} />
            <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                <Route path="/app" element={<RoleRedirect />} />
                <Route path="/security-setup" element={<SecuritySetupPage />} />
                <Route path="/agent-pending" element={<AgentPendingPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route element={<ProtectedRoute roles={["customer"]} />}>
                  <Route path="/customer" element={<CustomerDashboard />} />
                  <Route path="/customer/chat" element={<ChatPage />} />
                  <Route path="/customer/chat/:conversationId" element={<ChatPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={["agent"]} />}>
                  <Route path="/agent" element={<AgentDashboard />} />
                  <Route path="/agent/chats" element={<ChatPage />} />
                  <Route path="/agent/chats/:conversationId" element={<ChatPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={["admin", "super_admin"]} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/agents" element={<UserManagement roleFilter="agent" />} />
                  <Route path="/admin/conversations" element={<AdminConversations />} />
                  <Route path="/admin/conversations/:conversationId" element={<ChatPage />} />
                  <Route path="/admin/analytics" element={<AdminDashboard expanded />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RouteErrorBoundary>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const theme = useUiStore((state) => state.theme);
  const { token, hasHydrated, setUser, clearSession, setAuthRefreshing, setAuthError } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.title = PRODUCT_NAME;
  }, [theme]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      setAuthRefreshing(false);
      return;
    }
    let cancelled = false;
    setAuthRefreshing(true);
    api.get("/api/auth/me")
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("[auth] Failed to refresh current user", error);
          setAuthError(error.message || "Unable to refresh your session");
          clearSession();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, hasHydrated, setUser, clearSession, setAuthRefreshing, setAuthError]);

  return (
    <>
      <ToastHost />
      <AnimatedRoutes />
    </>
  );
}
