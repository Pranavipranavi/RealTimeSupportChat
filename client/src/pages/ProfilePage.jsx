import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const pushToast = useUiStore((state) => state.pushToast);
  const [form, setForm] = useState({ name: user?.name || "", avatar: user?.avatar || "" });
  const mutation = useMutation({
    mutationFn: (payload) => api.patch("/api/auth/profile", payload),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      pushToast({ title: "Profile updated", body: "Your workspace identity is current." });
    }
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader title="Profile management" eyebrow="Account" />
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}>
          <div className="flex items-center gap-4">
            <img className="h-16 w-16 rounded-full bg-slate-200 object-cover" src={form.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(form.name || "SF")}`} alt="" />
            <div>
              <p className="font-black">{user?.email}</p>
              <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
            </div>
          </div>
          <Input label="Display name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <Input label="Avatar URL" value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} placeholder="https://..." />
          {mutation.error ? <p className="text-sm font-semibold text-rose-500">{mutation.error.message}</p> : null}
          <Button icon={Save} isLoading={mutation.isPending}>Save profile</Button>
        </form>
      </Card>
    </div>
  );
}
