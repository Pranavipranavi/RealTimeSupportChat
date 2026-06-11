import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { PresenceBadge } from "../../components/ui/PresenceBadge.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuthStore } from "../../store/authStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { formatDate } from "../../utils/format.js";
import { isSuperAdminRole, statusOptionsFor, ticketStatuses } from "../../utils/product.js";

function customerFor(conversation) {
  return conversation.participants?.find((participant) => participant.role === "customer");
}

function LockedModifyNotice() {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <LockKeyhole className="h-4 w-4" />
      Only Super Admin can modify this
    </div>
  );
}

export function AdminConversations() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((state) => state.pushToast);
  const user = useAuthStore((state) => state.user);
  const canModifyTicket = isSuperAdminRole(user?.role);
  const [filters, setFilters] = useState({ q: "", status: "", category: "" });
  const debouncedQ = useDebouncedValue(filters.q);
  const params = new URLSearchParams(Object.entries({ ...filters, q: debouncedQ }).filter(([, value]) => value)).toString();
  const conversationsQuery = useQuery({
    queryKey: ["admin-conversations", { ...filters, q: debouncedQ }],
    queryFn: () => api.get(`/api/conversations${params ? `?${params}` : ""}`)
  });
  const agentsQuery = useQuery({
    queryKey: ["approved-agents"],
    queryFn: () => api.get("/api/admin/users?role=agent&approvalStatus=approved&limit=100"),
    enabled: canModifyTicket
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/conversations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      pushToast({ title: "Ticket status updated", body: "Workflow state was saved." });
    },
    onError: (error) => pushToast({ title: "Status update failed", body: error.message })
  });
  const assignmentMutation = useMutation({
    mutationFn: ({ id, agentId }) => api.patch(`/api/conversations/${id}/assignment`, { agentId }),
    onSuccess: ({ conversation }) => {
      console.info("[assignment] Assignment saved from admin list", {
        conversationId: conversation._id,
        assignedAgent: conversation.assignedAgent?._id || null
      });
      queryClient.setQueriesData({ queryKey: ["admin-conversations"] }, (old) => old?.conversations ? {
        ...old,
        conversations: old.conversations.map((item) => item._id === conversation._id ? { ...item, ...conversation } : item)
      } : old);
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      pushToast({ title: "Assignment updated", body: "The assigned agent has been notified." });
    },
    onError: (error, variables) => {
      console.error("[assignment] Assignment failed from admin list", { ...variables, error: error.message });
      pushToast({ title: "Assignment failed", body: error.message });
    }
  });
  const conversations = conversationsQuery.data?.conversations || [];
  const agents = agentsQuery.data?.users?.filter((agent) => !agent.disabled) || [];

  return (
    <Card>
      <CardHeader
        title="Conversation management"
        eyebrow="Admin"
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="w-56 pl-9" placeholder="Search" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
            </div>
            <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All statuses</option>
              {ticketStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="">All categories</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="general">General</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
        }
      />
      {conversationsQuery.isLoading ? <SkeletonList /> : null}
      {conversationsQuery.isError ? <ErrorState message={conversationsQuery.error.message} onRetry={conversationsQuery.refetch} /> : null}
      {!conversationsQuery.isLoading && !conversations.length ? <EmptyState title="No conversations found" body="Customer conversations will appear here." /> : null}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {conversations.map((conversation) => {
          const customer = customerFor(conversation);
          return (
            <div key={conversation._id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Link to={`/admin/conversations/${conversation._id}`} className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{conversation.subject}</h3>
                  <StatusBadge value={conversation.status} />
                  <StatusBadge value={conversation.priority} />
                  {conversation.unreadCount ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-black text-white">{conversation.unreadCount} unread</span> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{conversation.lastMessagePreview || conversation.summary || "No messages yet."}</p>
                <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 md:grid-cols-2">
                  <span>Customer: {customer?.name || "Unknown"}{customer?.email ? ` (${customer.email})` : ""}</span>
                  <span>Agent: {conversation.assignedAgent?.name || "Unassigned"}</span>
                  <span>Last activity: {formatDate(conversation.lastMessageAt)}</span>
                  <span>Category: {conversation.category}</span>
                </div>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {canModifyTicket ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Workflow</span>
                      <select className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={conversation.status} onChange={(event) => statusMutation.mutate({ id: conversation._id, status: event.target.value })}>
                        {statusOptionsFor(conversation.status).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Agent</span>
                      <select className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={conversation.assignedAgent?._id || ""} onChange={(event) => assignmentMutation.mutate({ id: conversation._id, agentId: event.target.value || null })}>
                        <option value="">Unassigned</option>
                        {agents.map((agent) => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                      </select>
                      {conversation.assignedAgent ? <div className="mt-2"><PresenceBadge status={conversation.assignedAgent.status} /></div> : null}
                    </label>
                  </>
                ) : (
                  <LockedModifyNotice />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
