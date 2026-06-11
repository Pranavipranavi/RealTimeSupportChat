import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, LockKeyhole, Search, ShieldCheck as ShieldIcon, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client.js";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuthStore } from "../../store/authStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { isSuperAdminRole, roleLabel } from "../../utils/product.js";

function agentState(user) {
  if (user.disabled) return "disabled";
  return user.approvalStatus || "approved";
}

export function UserManagement({ roleFilter = "" }) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((state) => state.pushToast);
  const currentUser = useAuthStore((state) => state.user);
  const setCurrentUser = useAuthStore((state) => state.setUser);
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const [filters, setFilters] = useState({ q: "", approvalStatus: "" });
  const debouncedQ = useDebouncedValue(filters.q);
  const params = new URLSearchParams(Object.entries({ q: debouncedQ, role: roleFilter, approvalStatus: filters.approvalStatus }).filter(([, value]) => value)).toString();
  const usersQuery = useQuery({
    queryKey: ["admin-users", roleFilter, debouncedQ, filters.approvalStatus],
    queryFn: () => api.get(`/api/admin/users${params ? `?${params}` : ""}`)
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      pushToast({ title: "Role updated", body: "Access permissions have been changed." });
    },
    onError: (error) => pushToast({ title: "Role update failed", body: error.message })
  });
  const approvalMutation = useMutation({
    mutationFn: ({ id, approvalStatus }) => api.patch(`/api/admin/users/${id}/approval`, { approvalStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      pushToast({ title: "Agent approval updated", body: "Support access has been changed." });
    },
    onError: (error) => pushToast({ title: "Agent approval failed", body: error.message })
  });
  const disabledMutation = useMutation({
    mutationFn: ({ id, disabled }) => api.patch(`/api/admin/users/${id}/disabled`, { disabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      pushToast({ title: "User status updated", body: "Account access has been changed." });
    },
    onError: (error) => pushToast({ title: "User status failed", body: error.message })
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      pushToast({ title: "User deleted", body: "The account was removed." });
    },
    onError: (error) => pushToast({ title: "Delete failed", body: error.message })
  });
  const transferMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/admin/users/${id}/transfer-ownership`, {}),
    onSuccess: ({ user, previousOwner }) => {
      if (previousOwner) setCurrentUser(previousOwner);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      pushToast({ title: "Ownership transferred", body: `${user.email} is now Super Admin.` });
    },
    onError: (error) => pushToast({ title: "Transfer failed", body: error.message })
  });
  const users = usersQuery.data?.users || [];

  function deleteUser(user) {
    if (window.confirm(`Delete ${user.email}? This cannot be undone.`)) deleteMutation.mutate(user._id);
  }

  function restrictedButton(label, Icon = Ban) {
    return (
      <Button type="button" variant="secondary" className="h-9 px-2" icon={Icon} disabled title="Requires Super Admin">
        {label}
      </Button>
    );
  }

  function lockedModifyNotice() {
    return (
      <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <LockKeyhole className="h-4 w-4" />
        Only Super Admin can modify this
      </div>
    );
  }

  function canDeleteUser(user) {
    if (String(user._id) === String(currentUser?._id)) return false;
    return isSuperAdmin;
  }

  function canDisableUser(user) {
    if (String(user._id) === String(currentUser?._id)) return false;
    return isSuperAdmin;
  }

  function renderActions(user) {
    const state = user.role === "agent" ? agentState(user) : user.disabled ? "disabled" : user.status;
    const commonDelete = canDeleteUser(user)
      ? <Button type="button" variant="danger" className="h-9 px-2" icon={Trash2} onClick={() => deleteUser(user)}>Delete</Button>
      : restrictedButton("Delete", Trash2);
    const disableButton = canDisableUser(user)
      ? <Button type="button" variant="secondary" className="h-9 px-2" icon={user.disabled ? CheckCircle2 : Ban} onClick={() => disabledMutation.mutate({ id: user._id, disabled: !user.disabled })}>{user.disabled ? "Enable" : "Disable"}</Button>
      : restrictedButton(user.disabled ? "Enable" : "Disable", user.disabled ? CheckCircle2 : Ban);

    if (user.role !== "agent") {
      return (
        <>
          {disableButton}
          {isSuperAdmin && user.role === "admin" && String(user._id) !== String(currentUser?._id) ? (
            <Button type="button" variant="secondary" className="h-9 px-2" icon={ShieldIcon} onClick={() => transferMutation.mutate(user._id)}>Transfer</Button>
          ) : null}
          {commonDelete}
        </>
      );
    }

    if (state === "pending") {
      return (
        <>
          <Button type="button" variant="secondary" className="h-9 px-2" icon={CheckCircle2} onClick={() => approvalMutation.mutate({ id: user._id, approvalStatus: "approved" })}>Approve</Button>
          <Button type="button" variant="secondary" className="h-9 px-2" icon={XCircle} onClick={() => approvalMutation.mutate({ id: user._id, approvalStatus: "rejected" })}>Reject</Button>
        </>
      );
    }

    if (state === "approved") {
      return (
        <>
          {disableButton}
          {commonDelete}
        </>
      );
    }

    if (state === "rejected") {
      return (
        <>
          <Button type="button" variant="secondary" className="h-9 px-2" icon={CheckCircle2} onClick={() => approvalMutation.mutate({ id: user._id, approvalStatus: "approved" })}>Approve</Button>
          {commonDelete}
        </>
      );
    }

    return (
      <>
        {disableButton}
        {commonDelete}
      </>
    );
  }

  return (
    <Card>
      <CardHeader
        title={roleFilter === "agent" ? "Agent management" : "User management"}
        eyebrow={isSuperAdmin ? "Super Admin" : "Admin"}
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search people" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
            </div>
            {roleFilter === "agent" ? (
              <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={filters.approvalStatus} onChange={(event) => setFilters({ ...filters, approvalStatus: event.target.value })}>
                <option value="">All approval states</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            ) : null}
          </div>
        }
      />
      {usersQuery.isLoading ? <SkeletonList /> : null}
      {usersQuery.isError ? <ErrorState message={usersQuery.error.message} onRetry={usersQuery.refetch} /> : null}
      {!usersQuery.isLoading && !users.length ? <EmptyState title="No users found" body="Registered people will appear here." /> : null}
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${isSuperAdmin ? "min-w-[1320px]" : "min-w-[1180px]"}`}>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Agent State</th>
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">CRM</th>
              {isSuperAdmin ? <th className="px-5 py-3">Recovery</th> : null}
              <th className="px-5 py-3">Presence</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((user) => {
              const state = user.role === "agent" ? agentState(user) : user.disabled ? "disabled" : "approved";
              const locksOwnSuperAdminRole = String(user._id) === String(currentUser?._id) && user.role === "super_admin";
              return (
                <tr key={user._id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img className="h-9 w-9 rounded-full bg-slate-200 object-cover" src={user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.name)}`} alt="" />
                      <div><p className="font-bold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge value={user.role} />
                      <span className="text-xs text-slate-500">{roleLabel(user.role)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge value={state} /></td>
                  <td className="px-5 py-4">{user.company || "-"}</td>
                  <td className="px-5 py-4 capitalize">{String(user.customerStatus || "-").replaceAll("_", " ")}</td>
                  {isSuperAdmin ? <td className="px-5 py-4">{user.securityRecoveryEnabled ? "Enabled" : "Missing"}</td> : null}
                  <td className="px-5 py-4"><StatusBadge value={user.disabled ? "disabled" : user.status} /></td>
                  <td className="px-5 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {isSuperAdmin ? (
                        <>
                          <select className="focus-ring rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" value={user.role} disabled={locksOwnSuperAdminRole} title={locksOwnSuperAdminRole ? "Transfer ownership before demoting yourself" : undefined} onChange={(event) => roleMutation.mutate({ id: user._id, role: event.target.value })}>
                            <option value="customer">Customer</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          {renderActions(user)}
                        </>
                      ) : lockedModifyNotice()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
