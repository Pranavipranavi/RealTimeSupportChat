import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client.js";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useUiStore } from "../../store/uiStore.js";

export function UserManagement({ roleFilter = "" }) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((state) => state.pushToast);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const params = new URLSearchParams(Object.entries({ q: debouncedQ, role: roleFilter }).filter(([, value]) => value)).toString();
  const usersQuery = useQuery({
    queryKey: ["admin-users", roleFilter, debouncedQ],
    queryFn: () => api.get(`/api/admin/users${params ? `?${params}` : ""}`)
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      pushToast({ title: "Role updated", body: "Access permissions have been changed." });
    }
  });
  const users = usersQuery.data?.users || [];

  return (
    <Card>
      <CardHeader
        title={roleFilter === "agent" ? "Agent management" : "User management"}
        eyebrow="Admin"
        action={<div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search people" value={q} onChange={(event) => setQ(event.target.value)} /></div>}
      />
      {usersQuery.isLoading ? <SkeletonList /> : null}
      {usersQuery.isError ? <ErrorState message={usersQuery.error.message} onRetry={usersQuery.refetch} /> : null}
      {!usersQuery.isLoading && !users.length ? <EmptyState title="No users found" body="Registered people will appear here." /> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((user) => (
              <tr key={user._id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img className="h-9 w-9 rounded-full bg-slate-200 object-cover" src={user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.name)}`} alt="" />
                    <div><p className="font-bold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
                  </div>
                </td>
                <td className="px-5 py-4 capitalize">{user.role}</td>
                <td className="px-5 py-4 capitalize">{user.status}</td>
                <td className="px-5 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <select className="focus-ring rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={user.role} onChange={(event) => roleMutation.mutate({ id: user._id, role: event.target.value })}>
                      <option value="customer">Customer</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button variant="secondary" className="h-9 w-9 px-0" aria-label="Role"><ShieldCheck className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
