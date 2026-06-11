import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, MessageSquare, Star, Ticket, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client.js";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { formatDuration } from "../../utils/format.js";
import { isSuperAdminRole } from "../../utils/product.js";

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
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = isSuperAdminRole(user?.role);
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
    ["Total customers", totals.totalCustomers || 0, Users],
    ["Total agents", totals.totalAgents || 0, Users],
    ["Active users", totals.activeUsers, Activity],
    ["Online agents", totals.onlineAgents || 0, Activity],
    ["Messages today", totals.messagesToday, MessageSquare],
    ["Total conversations", totals.totalConversations, Ticket],
    ["Open tickets", totals.openTickets, Ticket],
    ["Assigned", totals.assignedTickets, Clock],
    ["In progress", totals.inProgressTickets, Clock],
    ["Waiting", totals.waitingTickets, Clock],
    ["Resolved tickets", totals.resolvedTickets, Ticket],
    ["Closed tickets", totals.closedTickets, Ticket],
    ["Resolution rate", `${totals.resolutionRate}%`, Star],
    ["Avg response", formatDuration(totals.averageResponseTimeMs), Clock],
    ["CSAT", `${totals.customerSatisfaction}/5`, Star],
    ["Pending agents", totals.pendingAgents, Clock],
    ["Rejected agents", totals.rejectedAgents, Users]
  ];
  if (isSuperAdmin) {
    stats.splice(stats.length - 2, 0, ["Recovery enabled", totals.securityRecoveryEnabled || 0, Users], ["Recovery missing", totals.securityRecoveryMissing || 0, Users]);
  }
  const ticketData = [
    { name: "Open", tickets: totals.openTickets },
    { name: "Assigned", tickets: totals.assignedTickets },
    { name: "In Progress", tickets: totals.inProgressTickets },
    { name: "Waiting", tickets: totals.waitingTickets },
    { name: "Resolved", tickets: totals.resolvedTickets },
    { name: "Closed", tickets: totals.closedTickets }
  ];
  const priorityData = [
    { name: "Low", tickets: totals.priorityLow || 0 },
    { name: "Normal", tickets: totals.priorityNormal || 0 },
    { name: "High", tickets: totals.priorityHigh || 0 },
    { name: "Urgent", tickets: totals.priorityUrgent || 0 }
  ];
  const performanceData = agents.map((item) => ({
    name: item.agent.name.split(" ")[0],
    conversations: item.conversations,
    resolved: item.resolved,
    open: item.open
  }));

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Admin command center</p>
        <h2 className="mt-1 text-2xl font-black">Support operations overview</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value, Icon]) => <Stat key={label} label={label} value={value} icon={Icon} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Tickets by status" eyebrow="Workflow" />
          <div className="h-80 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketData}>
                <defs>
                  <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="tickets" stroke="#3B82F6" fill="url(#ticketGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Tickets by priority" eyebrow="Quality signals" />
          <div className="h-80 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tickets" fill="#EC4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Agent performance" eyebrow="Realtime quality" />
        <div className="h-72 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="conversations" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="resolved" fill="#22C55E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
          <div className="h-80 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketData}>
                <defs>
                  <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="tickets" stroke="#3B82F6" fill="url(#ticketGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
