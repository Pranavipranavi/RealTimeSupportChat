import { useQuery } from "@tanstack/react-query";
import { Clock, MessageSquareReply, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { formatDate } from "../../utils/format.js";
import { useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";

export function AgentDashboard() {
  const [filters, setFilters] = useState({ q: "", status: "" });
  const debouncedQ = useDebouncedValue(filters.q);
  const query = new URLSearchParams(Object.entries({ ...filters, q: debouncedQ }).filter(([, value]) => value)).toString();
  const conversationsQuery = useQuery({
    queryKey: ["agent-conversations", { ...filters, q: debouncedQ }],
    queryFn: () => api.get(`/api/conversations${query ? `?${query}` : ""}`)
  });
  const conversations = conversationsQuery.data?.conversations || [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {["open", "pending", "resolved", "closed"].map((status) => (
          <Card key={status} className="p-5">
            <p className="text-sm font-semibold capitalize text-slate-500 dark:text-slate-400">{status}</p>
            <p className="mt-2 text-3xl font-black">{conversations.filter((item) => item.status === status).length}</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader
          title="Assigned conversations"
          eyebrow="Agent queue"
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
            </div>
          }
        />
        {conversationsQuery.isLoading ? <SkeletonList /> : null}
        {conversationsQuery.isError ? <ErrorState message={conversationsQuery.error.message} onRetry={conversationsQuery.refetch} /> : null}
        {!conversationsQuery.isLoading && !conversations.length ? <EmptyState title="No assigned conversations" body="New assignments appear here when customers create requests." /> : null}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {conversations.map((conversation) => (
            <Link key={conversation._id} to={`/agent/chats/${conversation._id}`} className="grid gap-3 p-5 transition hover:bg-slate-50 dark:hover:bg-slate-900 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{conversation.subject}</h3>
                  <StatusBadge value={conversation.status} />
                  <StatusBadge value={conversation.category} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{conversation.summary || "No summary available yet."}</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" /> {formatDate(conversation.lastMessageAt)}
                <MessageSquareReply className="h-4 w-4 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
