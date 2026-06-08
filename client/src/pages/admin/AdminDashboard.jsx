import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, MessageSquare, Star, Ticket, Users } from "lucide-react";
import { api } from "../../api/client.js";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { formatDuration } from "../../utils/format.js";

function Stat({ label, value, icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </Card>
  );
}

export function AdminDashboard({ expanded }) {
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/api/admin/analytics")
  });

  if (analyticsQuery.isLoading) return <SkeletonList rows={8} />;
  if (analyticsQuery.isError) return <ErrorState message={analyticsQuery.error.message} onRetry={analyticsQuery.refetch} />;

  const totals = analyticsQuery.data.totals;
  const agents = analyticsQuery.data.agentPerformance;
  const stats = [
    ["Total users", totals.totalUsers, Users],
    ["Active users", totals.activeUsers, Activity],
    ["Messages today", totals.messagesToday, MessageSquare],
    ["Total conversations", totals.totalConversations, Ticket],
    ["Open tickets", totals.openTickets, Ticket],
    ["Pending tickets", totals.pendingTickets, Clock],
    ["Resolved tickets", totals.resolvedTickets, Ticket],
    ["Closed tickets", totals.closedTickets, Ticket],
    ["Avg response", formatDuration(totals.averageResponseTimeMs), Clock],
    ["CSAT", `${totals.customerSatisfaction}/5`, Star]
  ];

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Admin command center</p>
        <h2 className="mt-1 text-2xl font-black">Support operations overview</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value, Icon]) => <Stat key={label} label={label} value={value} icon={Icon} />)}
      </div>
      <Card>
        <CardHeader title="Agent performance" eyebrow="Realtime quality" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Conversations</th>
                <th className="px-5 py-3">Open</th>
                <th className="px-5 py-3">Resolved</th>
                <th className="px-5 py-3">Avg response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {agents.map((item) => (
                <tr key={item.agent._id}>
                  <td className="px-5 py-4 font-bold">{item.agent.name}<p className="text-xs font-medium text-slate-500">{item.agent.email}</p></td>
                  <td className="px-5 py-4 capitalize">{item.agent.status}</td>
                  <td className="px-5 py-4">{item.conversations}</td>
                  <td className="px-5 py-4">{item.open}</td>
                  <td className="px-5 py-4">{item.resolved}</td>
                  <td className="px-5 py-4">{formatDuration(item.averageResponseTimeMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {expanded ? (
        <Card>
          <CardHeader title="Ticket distribution" eyebrow="Analytics" />
          <div className="grid gap-4 p-5 md:grid-cols-4">
            {[
              ["Open", totals.openTickets, "bg-primary"],
              ["Pending", totals.pendingTickets, "bg-accent"],
              ["Resolved", totals.resolvedTickets, "bg-success"],
              ["Closed", totals.closedTickets, "bg-slate-400"]
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>{label}</span><span>{value}</span></div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, (value / Math.max(totals.totalConversations, 1)) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
