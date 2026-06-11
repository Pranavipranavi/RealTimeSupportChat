import { Clock3, LogOut } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { PageLoader } from "../components/ui/State.jsx";
import { useAuthStore } from "../store/authStore.js";

export function AgentPendingPage() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  useEffect(() => {
    console.info("[agent-pending] route state", {
      hasUser: Boolean(user),
      role: user?.role,
      approvalStatus: user?.approvalStatus
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "agent" || user.approvalStatus === "approved") navigate("/app", { replace: true });
  }, [navigate, user]);

  async function logout() {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      // Session still clears locally if the network drops.
    }
    clearSession();
    navigate("/login", { replace: true });
  }

  const rejected = user?.approvalStatus === "rejected";

  if (!user) return <PageLoader />;
  if (user.role !== "agent" || user.approvalStatus === "approved") return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader title={rejected ? "Agent access rejected" : "Agent approval pending"} eyebrow="Support agent access" />
        <div className="space-y-4 p-5">
          <div className={`rounded-lg border p-4 ${rejected ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"}`}>
            <Clock3 className="h-6 w-6" />
            <p className="mt-3 text-sm font-semibold">
              {rejected
                ? "An administrator rejected this support agent request. Contact an admin if this should be reviewed again."
                : "An administrator needs to approve this support agent account before queue, chat, and ticket tools become available."}
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <p className="font-bold text-slate-950 dark:text-white">{user?.name}</p>
            <p>{user?.email}</p>
          </div>
          <Button variant="secondary" icon={LogOut} onClick={logout}>Logout</Button>
        </div>
      </Card>
    </div>
  );
}
