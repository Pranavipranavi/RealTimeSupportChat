import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCirclePlus, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { Input, Textarea } from "../../components/ui/Input.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useUiStore } from "../../store/uiStore.js";
import { formatDate } from "../../utils/format.js";

export function CustomerDashboard() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((state) => state.pushToast);
  const [form, setForm] = useState({ subject: "", content: "", category: "" });
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const conversationsQuery = useQuery({
    queryKey: ["conversations", debouncedQ],
    queryFn: () => api.get(`/api/conversations${debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : ""}`)
  });
  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/api/conversations", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setForm({ subject: "", content: "", category: "" });
      pushToast({ title: "Conversation created", body: "A support agent has been assigned automatically." });
    }
  });

  const conversations = conversationsQuery.data?.conversations || [];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader title="Start a support conversation" eyebrow="Customer portal" />
        <form className="space-y-4 p-5" onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate({ ...form, category: form.category || undefined });
        }}>
          <Input label="Subject" placeholder="Billing renewal, API issue, product feedback..." value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required />
          <Textarea label="Message" placeholder="Tell the team what happened and what you need." value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
            <select className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">Auto categorize</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="general">General</option>
              <option value="feedback">Feedback</option>
            </select>
          </label>
          <Button className="w-full" icon={MessageCirclePlus} isLoading={createMutation.isPending}>Create conversation</Button>
          {createMutation.error ? <p className="text-sm font-semibold text-rose-500">{createMutation.error.message}</p> : null}
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Conversation history"
          eyebrow="Live support"
          action={<div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search" value={q} onChange={(event) => setQ(event.target.value)} /></div>}
        />
        {conversationsQuery.isLoading ? <SkeletonList /> : null}
        {conversationsQuery.isError ? <ErrorState message={conversationsQuery.error.message} onRetry={conversationsQuery.refetch} /> : null}
        {!conversationsQuery.isLoading && !conversationsQuery.isError && !conversations.length ? (
          <EmptyState title="No conversations yet" body="Create your first support request and it will appear here." />
        ) : null}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {conversations.map((conversation) => (
            <motion.div key={conversation._id} whileHover={{ x: 2 }}>
              <Link to={`/customer/chat/${conversation._id}`} className="block p-5 transition hover:bg-slate-50 dark:hover:bg-slate-900/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-black text-slate-950 dark:text-white">{conversation.subject}</h3>
                  <div className="flex gap-2"><StatusBadge value={conversation.status} /><StatusBadge value={conversation.category} /></div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{conversation.summary || "SupportFlow is building a summary as your conversation develops."}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>{conversation.assignedAgent?.name || "Assignment pending"}</span>
                  <span>{formatDate(conversation.lastMessageAt)}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {["Automatic agent assignment", "Local AI conversation summaries", "Uploads, emoji, reactions, receipts"].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <Sparkles className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm font-bold">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
