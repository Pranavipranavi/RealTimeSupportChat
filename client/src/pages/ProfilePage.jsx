import { useMutation } from "@tanstack/react-query";
import { Bell, KeyRound, Moon, Save, ShieldCheck, Sun } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";
import { roleLabel } from "../utils/product.js";

const defaultNotificationPreferences = { browser: true, sound: true, emailDigest: false };

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const pushToast = useUiStore((state) => state.pushToast);
  const [form, setForm] = useState({ name: user?.name || "", company: user?.company || "", customerStatus: user?.customerStatus || "active", avatar: user?.avatar || "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "" });
  const [securityForm, setSecurityForm] = useState({ securityQuestion: user?.securityQuestion || "", securityAnswer: "" });
  const [notificationPreferences, setNotificationPreferences] = useState({ ...defaultNotificationPreferences, ...(user?.notificationPreferences || {}) });

  const mutation = useMutation({
    mutationFn: (payload) => api.patch("/api/auth/profile", payload),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      pushToast({ title: "Profile updated", body: "Your workspace identity is current." });
    }
  });
  const passwordMutation = useMutation({
    mutationFn: (payload) => api.patch("/api/auth/password", payload),
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", password: "" });
      pushToast({ title: "Password updated", body: "Your credentials were changed." });
    }
  });
  const securityMutation = useMutation({
    mutationFn: (payload) => api.patch("/api/auth/security", payload),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      setSecurityForm({ securityQuestion: updated.securityQuestion || "", securityAnswer: "" });
      pushToast({ title: "Security updated", body: "Password recovery settings are current." });
    }
  });
  const preferencesMutation = useMutation({
    mutationFn: (payload) => api.patch("/api/auth/preferences", { notificationPreferences: payload }),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      pushToast({ title: "Preferences saved", body: "Notification settings are current." });
    }
  });

  return (
    <div className="mx-auto grid max-w-4xl gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Profile" eyebrow="Account" />
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}>
          <div className="flex items-center gap-4">
            <img className="h-16 w-16 rounded-full bg-slate-200 object-cover" src={form.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(form.name || "SF")}`} alt="" />
            <div>
              <p className="font-black">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge value={user?.role} />
                <span className="text-sm text-slate-500 dark:text-slate-400">{roleLabel(user?.role)}</span>
              </div>
            </div>
          </div>
          <Input label="Display name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <Input label="Company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Acme Inc." />
          {user?.role === "customer" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Customer status</span>
              <select className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.customerStatus} onChange={(event) => setForm({ ...form, customerStatus: event.target.value })}>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="at_risk">At Risk</option>
              </select>
            </label>
          ) : null}
          <Input label="Avatar URL" value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} placeholder="https://..." />
          {mutation.error ? <p className="text-sm font-semibold text-rose-500">{mutation.error.message}</p> : null}
          <Button icon={Save} isLoading={mutation.isPending}>Save profile</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" eyebrow="Security" />
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault();
          passwordMutation.mutate(passwordForm);
        }}>
          <Input label="Current password" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required />
          <Input label="New password" type="password" value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} required />
          {passwordMutation.error ? <p className="text-sm font-semibold text-rose-500">{passwordMutation.error.message}</p> : null}
          <Button icon={KeyRound} isLoading={passwordMutation.isPending}>Update password</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Security question" eyebrow="Account recovery" />
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault();
          securityMutation.mutate(securityForm);
        }}>
          <div className={`rounded-lg border p-3 text-sm font-semibold ${user?.securityRecoveryEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"}`}>
            {user?.securityRecoveryEnabled ? "Security recovery is enabled." : "Security recovery is not configured yet."}
          </div>
          <Input label="Security question" value={securityForm.securityQuestion} onChange={(event) => setSecurityForm({ ...securityForm, securityQuestion: event.target.value })} required />
          <Input label="Security answer" type="password" value={securityForm.securityAnswer} onChange={(event) => setSecurityForm({ ...securityForm, securityAnswer: event.target.value })} required />
          {securityMutation.error ? <p className="text-sm font-semibold text-rose-500">{securityMutation.error.message}</p> : null}
          <Button icon={ShieldCheck} isLoading={securityMutation.isPending}>Save security settings</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Preferences" eyebrow="Workspace" />
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="font-bold">Theme</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Switch between dark and light mode.</p>
            </div>
            <Button type="button" variant="secondary" icon={theme === "dark" ? Sun : Moon} onClick={toggleTheme}>{theme === "dark" ? "Light" : "Dark"}</Button>
          </div>
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            preferencesMutation.mutate(notificationPreferences);
          }}>
            {[
              ["browser", "Browser notifications"],
              ["sound", "Notification sounds"],
              ["emailDigest", "Email digest"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
                <span>{label}</span>
                <input type="checkbox" checked={notificationPreferences[key]} onChange={(event) => setNotificationPreferences({ ...notificationPreferences, [key]: event.target.checked })} />
              </label>
            ))}
            {preferencesMutation.error ? <p className="text-sm font-semibold text-rose-500">{preferencesMutation.error.message}</p> : null}
            <Button icon={Bell} isLoading={preferencesMutation.isPending}>Save preferences</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
