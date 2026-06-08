import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { formatDate } from "../../utils/format.js";

export function AdminConversations() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: "", status: "", category: "" });
  const debouncedQ = useDebouncedValue(filters.q);
  const params = new URLSearchParams(Object.entries({ ...filters, q: debouncedQ }).filter(([, value]) => value)).toString();
  const conversationsQuery = useQuery({
    queryKey: ["admin-conversations", { ...filters, q: debouncedQ }],
    queryFn: () => api.get(`/api/conversations${params ? `?${params}` : ""}`)
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/conversations/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-conversations"] })
  });
  const conversations = conversationsQuery.data?.conversations || [];

  return (
    <Card>
      <CardHeader
        title="Conversation management"
        eyebrow="Admin"
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="w-56 pl-9" placeholder="Search" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></div>
            <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
        {conversations.map((conversation) => (
          <div key={conversation._id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
            <Link to={`/admin/conversations/${conversation._id}`} className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black">{conversation.subject}</h3>
                <StatusBadge value={conversation.category} />
                <StatusBadge value={conversation.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{conversation.summary || "No summary yet."}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">Agent: {conversation.assignedAgent?.name || "Unassigned"} | Updated {formatDate(conversation.lastMessageAt)}</p>
            </Link>
            <select className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={conversation.status} onChange={(event) => statusMutation.mutate({ id: conversation._id, status: event.target.value })}>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        ))}
      </div>
    </Card>
  );
}
