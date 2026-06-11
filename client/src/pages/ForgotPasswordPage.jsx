import { useMutation } from "@tanstack/react-query";
import { KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";

export function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: "", securityAnswer: "", password: "" });
  const [challenge, setChallenge] = useState(null);

  const forgot = useMutation({
    mutationFn: () => api.post("/api/auth/forgot-password", { email: form.email }),
    onSuccess: (data) => {
      setChallenge(data);
    },
    onError: () => {
      setChallenge(null);
    }
  });
  const reset = useMutation({
    mutationFn: () => api.post("/api/auth/reset-password", form),
    onSuccess: () => {
      setForm({ email: "", securityAnswer: "", password: "" });
      setChallenge(null);
    }
  });

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-dark-bg">
      <Card className="w-full max-w-md">
        <CardHeader title="Reset password" eyebrow="Account recovery" />
        <div className="space-y-6 p-5">
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            forgot.mutate();
          }}>
            <Input label="Account email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <Button className="w-full" icon={Mail} isLoading={forgot.isPending}>Find recovery question</Button>
            {forgot.error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{forgot.error.message}</p> : null}
          </form>

          {challenge?.securityQuestion ? (
            <form className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800" onSubmit={(event) => {
              event.preventDefault();
              reset.mutate();
            }}>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Security question</p>
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{challenge.securityQuestion}</p>
              </div>
              <Input label="Security answer" type="password" value={form.securityAnswer} onChange={(event) => setForm({ ...form, securityAnswer: event.target.value })} required />
              <Input label="New password" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <Button className="w-full" icon={KeyRound} isLoading={reset.isPending}>Set new password</Button>
              {reset.data ? <p className="text-sm font-semibold text-success">Password has been reset. You can now login.</p> : null}
              {reset.error ? <p className="text-sm font-semibold text-rose-500">{reset.error.message}</p> : null}
            </form>
          ) : null}

          <Link className="block text-center text-sm font-bold text-primary" to="/login">Back to login</Link>
        </div>
      </Card>
    </div>
  );
}
