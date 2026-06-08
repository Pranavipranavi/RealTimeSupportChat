import { useMutation } from "@tanstack/react-query";
import { KeyRound, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const initialToken = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [devToken, setDevToken] = useState("");

  const forgot = useMutation({
    mutationFn: () => api.post("/api/auth/forgot-password", { email }),
    onSuccess: (data) => {
      if (data.resetToken) setDevToken(data.resetToken);
    }
  });
  const reset = useMutation({
    mutationFn: () => api.post("/api/auth/reset-password", { token, password })
  });

  const resetReady = useMemo(() => token.length >= 32, [token]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-dark-bg">
      <Card className="w-full max-w-md">
        <CardHeader title="Reset password" eyebrow="Account recovery" />
        <div className="space-y-6 p-5">
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            forgot.mutate();
          }}>
            <Input label="Account email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Button className="w-full" icon={Mail} isLoading={forgot.isPending}>Prepare reset token</Button>
            {forgot.data ? <p className="text-sm font-semibold text-success">{forgot.data.message}</p> : null}
            {devToken ? <p className="break-all rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Development reset token: {devToken}</p> : null}
          </form>

          <form className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800" onSubmit={(event) => {
            event.preventDefault();
            reset.mutate();
          }}>
            <Input label="Reset token" value={token} onChange={(event) => setToken(event.target.value)} required />
            <Input label="New password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button className="w-full" icon={KeyRound} isLoading={reset.isPending} disabled={!resetReady}>Set new password</Button>
            {reset.data ? <p className="text-sm font-semibold text-success">{reset.data.message}</p> : null}
            {reset.error ? <p className="text-sm font-semibold text-rose-500">{reset.error.message}</p> : null}
          </form>
          <Link className="block text-center text-sm font-bold text-primary" to="/login">Back to login</Link>
        </div>
      </Card>
    </div>
  );
}
