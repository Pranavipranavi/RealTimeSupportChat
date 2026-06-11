import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { ErrorState, PageLoader } from "../components/ui/State.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";

export function SecuritySetupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const pushToast = useUiStore((state) => state.pushToast);
  const [form, setForm] = useState({ securityQuestion: user?.securityQuestion || "", securityAnswer: "" });
  const statusQuery = useQuery({
    queryKey: ["security-status"],
    queryFn: () => api.get("/api/auth/security"),
    enabled: Boolean(user)
  });
  const mutation = useMutation({
    mutationFn: (payload) => api.patch("/api/auth/security", payload),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      pushToast({ title: "Recovery enabled", body: "Your account recovery question is ready." });
      navigate("/app", { replace: true });
    }
  });

  const securityRecoveryEnabled = statusQuery.data?.securityRecoveryEnabled ?? user?.securityRecoveryEnabled;
  const securityQuestion = statusQuery.data?.securityQuestion ?? user?.securityQuestion ?? "";

  useEffect(() => {
    console.info("[security-setup] route state", {
      hasUser: Boolean(user),
      statusLoading: statusQuery.isLoading,
      statusError: Boolean(statusQuery.error),
      securityRecoveryEnabled
    });
  }, [securityRecoveryEnabled, statusQuery.error, statusQuery.isLoading, user]);

  useEffect(() => {
    setForm((current) => ({ ...current, securityQuestion: securityQuestion || current.securityQuestion }));
  }, [securityQuestion]);

  useEffect(() => {
    if (securityRecoveryEnabled) navigate("/app", { replace: true });
  }, [navigate, securityRecoveryEnabled]);

  if (!user) return <PageLoader />;
  if (statusQuery.isLoading) return <PageLoader />;
  if (statusQuery.isError) return <ErrorState message={statusQuery.error.message} onRetry={statusQuery.refetch} />;
  if (securityRecoveryEnabled) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader title="Secure your account" eyebrow="Required setup" />
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}>
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
            Add a security question so password recovery works without development reset tokens.
          </p>
          <Input label="Security question" value={form.securityQuestion} onChange={(event) => setForm({ ...form, securityQuestion: event.target.value })} placeholder="What was the name of your first project?" required />
          <Input label="Security answer" type="password" value={form.securityAnswer} onChange={(event) => setForm({ ...form, securityAnswer: event.target.value })} required />
          {mutation.error ? <p className="text-sm font-semibold text-rose-500">{mutation.error.message}</p> : null}
          <Button icon={ShieldCheck} isLoading={mutation.isPending}>Save recovery question</Button>
        </form>
      </Card>
    </div>
  );
}
