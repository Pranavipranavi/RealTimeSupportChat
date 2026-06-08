import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Paperclip, Search, Send, Smile, Sparkles, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, assetUrl } from "../../api/client.js";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useSocket } from "../../hooks/useSocket.js";
import { useAuthStore } from "../../store/authStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { formatDate } from "../../utils/format.js";

const emojis = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F389}", "\u{1F64F}", "\u{1F440}"];

function MessageBubble({ message, currentUserId, onReact }) {
  const mine = String(message.senderId?._id || message.senderId) === String(currentUserId);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[82%] rounded-lg px-4 py-3 shadow-sm ${mine ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-white"}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-bold opacity-80">{mine ? "You" : message.senderId?.name || "Teammate"}</span>
          <span className="text-[11px] opacity-60">{formatDate(message.timestamp)}</span>
        </div>
        {message.content ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : null}
        {message.attachments?.length ? (
          <div className="mt-3 grid gap-2">
            {message.attachments.map((file) => (
              <a key={file.url} href={assetUrl(file.url)} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${mine ? "bg-white/15" : "bg-slate-100 dark:bg-slate-800"}`}>
                <FileText className="h-4 w-4" /> {file.filename}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {message.reactions?.map((reaction, index) => (
            <span key={`${reaction.emoji}-${index}`} className={`rounded-full px-2 py-0.5 text-xs ${mine ? "bg-white/15" : "bg-slate-100 dark:bg-slate-800"}`}>{reaction.emoji}</span>
          ))}
          <div className="hidden gap-1 group-hover:flex">
            {emojis.slice(0, 3).map((emoji) => (
              <button key={emoji} className={`rounded-full px-1.5 py-0.5 text-xs ${mine ? "bg-white/15" : "bg-slate-100 dark:bg-slate-800"}`} onClick={() => onReact(message._id, emoji)} aria-label={`React ${emoji}`}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
        {message.readStatus?.length > 1 ? <p className={`mt-1 text-right text-[11px] ${mine ? "text-blue-100" : "text-slate-400"}`}>Read</p> : null}
      </div>
    </motion.div>
  );
}

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const pushToast = useUiStore((state) => state.pushToast);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const [messageQ, setMessageQ] = useState("");
  const debouncedMessageQ = useDebouncedValue(messageQ);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const endRef = useRef(null);
  const typingTimerRef = useRef(null);

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations", user?.role, debouncedQ],
    queryFn: () => api.get(`/api/conversations${debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : ""}`)
  });
  const conversations = conversationsQuery.data?.conversations || [];
  const selectedId = conversationId || conversations[0]?._id;
  const detailQuery = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () => api.get(`/api/conversations/${selectedId}`),
    enabled: Boolean(selectedId)
  });

  const onMessage = useCallback((message) => {
    queryClient.setQueryData(["conversation", message.conversationId], (old) => old ? { ...old, messages: [...old.messages, message] } : old);
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
  }, [queryClient]);

  const onConversationUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
  }, [queryClient, selectedId]);
  const onReaction = useCallback((message) => {
    queryClient.setQueryData(["conversation", message.conversationId], (old) => old ? {
      ...old,
      messages: old.messages.map((item) => item._id === message._id ? { ...item, reactions: message.reactions } : item)
    } : old);
  }, [queryClient]);
  const onRead = useCallback(({ conversationId: readConversationId }) => {
    queryClient.invalidateQueries({ queryKey: ["conversation", readConversationId] });
  }, [queryClient]);

  const realtime = useSocket({ onMessage, onConversationUpdate, onReaction, onRead });

  useEffect(() => {
    if (!selectedId) return undefined;
    realtime.join(selectedId);
    realtime.markRead(selectedId);
    return () => realtime.leave(selectedId);
  }, [selectedId, realtime.join, realtime.leave, realtime.markRead]);

  useEffect(() => {
    if (!realtime.socket) return undefined;
    const start = ({ conversationId: id, user: typingUser }) => {
      if (id === selectedId) setTypingUsers((users) => [...users.filter((item) => item._id !== typingUser._id), typingUser]);
    };
    const stop = ({ userId }) => setTypingUsers((users) => users.filter((item) => item._id !== userId));
    realtime.socket.on("typing:start", start);
    realtime.socket.on("typing:stop", stop);
    return () => {
      realtime.socket.off("typing:start", start);
      realtime.socket.off("typing:stop", stop);
    };
  }, [realtime.socket, selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detailQuery.data?.messages?.length]);

  const messageSearchQuery = useQuery({
    queryKey: ["message-search", debouncedMessageQ],
    queryFn: () => api.get(`/api/messages/search?q=${encodeURIComponent(debouncedMessageQ)}&limit=8`),
    enabled: debouncedMessageQ.trim().length > 1
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post(`/api/messages/${selectedId}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setContent("");
      setFiles([]);
    }
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/api/conversations/${selectedId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    }
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selectedId}/summary`, {}),
    onSuccess: ({ summary }) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      pushToast({ title: "Summary refreshed", body: summary });
    }
  });

  const ratingMutation = useMutation({
    mutationFn: (payload) => api.post(`/api/ratings/${selectedId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      setRatingFeedback("");
      pushToast({ title: "Rating submitted", body: "Thanks for sharing your support experience." });
    }
  });

  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => api.post(`/api/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] })
  });

  async function send(event) {
    event.preventDefault();
    if (!content.trim() && !files.length) return;
    if (files.length) {
      const formData = new FormData();
      formData.append("content", content);
      files.forEach((file) => formData.append("attachments", file));
      uploadMutation.mutate(formData);
      return;
    }
    const result = await realtime.sendMessage({ conversationId: selectedId, content });
    if (result?.ok) setContent("");
    else pushToast({ title: "Message failed", body: result?.message || "Unable to send message." });
  }

  const routeBase = useMemo(() => {
    if (user?.role === "agent") return "/agent/chats";
    if (user?.role === "admin") return "/admin/conversations";
    return "/customer/chat";
  }, [user?.role]);

  const conversation = detailQuery.data?.conversation;
  const messages = detailQuery.data?.messages || [];

  return (
    <div className="grid h-[calc(100vh-6.5rem)] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-dark-card lg:grid-cols-[360px_1fr]">
      <aside className="hidden border-r border-slate-200 dark:border-slate-800 lg:block">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search conversations" value={q} onChange={(event) => setQ(event.target.value)} /></div>
        </div>
        <div className="scrollbar-soft h-full overflow-y-auto pb-20">
          {conversationsQuery.isLoading ? <SkeletonList rows={6} /> : null}
          {!conversationsQuery.isLoading && !conversations.length ? <EmptyState title="No chats" body="Assigned conversations will appear here." /> : null}
          {conversations.map((item) => (
            <Link key={item._id} to={`${routeBase}/${item._id}`} className={`block border-b border-slate-100 p-4 transition dark:border-slate-800 ${item._id === selectedId ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-1 text-sm font-black">{item.subject}</h3>
                <StatusBadge value={item.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.summary || "No messages yet."}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(item.lastMessageAt)}</p>
            </Link>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <div className="border-b border-slate-200 p-3 dark:border-slate-800 lg:hidden">
          <select
            className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={selectedId || ""}
            onChange={(event) => navigate(`${routeBase}/${event.target.value}`)}
          >
            <option value="">Select conversation</option>
            {conversations.map((item) => <option key={item._id} value={item._id}>{item.subject}</option>)}
          </select>
        </div>
        {!selectedId ? <EmptyState title="Select a conversation" body="Open a ticket to start messaging in real time." /> : null}
        {selectedId && detailQuery.isLoading ? <SkeletonList rows={8} /> : null}
        {detailQuery.isError ? <ErrorState message={detailQuery.error.message} onRetry={detailQuery.refetch} /> : null}
        {conversation ? (
          <>
            <header className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black">{conversation.subject}</h2>
                    <StatusBadge value={conversation.category} />
                    <StatusBadge value={conversation.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Agent: {conversation.assignedAgent?.name || "Unassigned"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user?.role !== "customer" ? (
                    <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={conversation.status} onChange={(event) => statusMutation.mutate(event.target.value)}>
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  ) : null}
                  <Button variant="secondary" icon={Sparkles} isLoading={summaryMutation.isPending} onClick={() => summaryMutation.mutate()}>Summary</Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <Input placeholder="Search messages" value={messageQ} onChange={(event) => setMessageQ(event.target.value)} />
                {messageSearchQuery.data?.messages?.length ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    {messageSearchQuery.data.messages.map((message) => (
                      <button
                        key={message._id}
                        type="button"
                        className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => setMessageQ(message.content)}
                      >
                        <span className="font-bold">{message.senderId?.name || "User"}:</span> {message.content || "Attachment"}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </header>

            <div className="scrollbar-soft flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
              {messages.map((message) => (
                <MessageBubble key={message._id} message={message} currentUserId={user?._id} onReact={(messageId, emoji) => reactionMutation.mutate({ messageId, emoji })} />
              ))}
              {typingUsers.length ? <p className="text-sm font-semibold text-slate-400">{typingUsers.map((item) => item.name).join(", ")} typing...</p> : null}
              <div ref={endRef} />
            </div>

            {user?.role === "customer" && ["resolved", "closed"].includes(conversation.status) ? (
              <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-dark-card">
                <div className="grid gap-2 md:grid-cols-[auto_1fr] md:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">Rate support</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} onClick={() => ratingMutation.mutate({ rating, feedback: ratingFeedback })} className="text-amber-400" aria-label={`Rate ${rating}`}>
                        <Star className={`h-5 w-5 ${rating <= (detailQuery.data?.rating?.rating || 0) ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Optional feedback" value={ratingFeedback} onChange={(event) => setRatingFeedback(event.target.value)} />
                </div>
              </div>
            ) : null}

            <form onSubmit={send} className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-dark-card">
              {files.length ? <p className="mb-2 text-xs font-semibold text-slate-500">{files.length} attachment(s) selected</p> : null}
              <div className="flex items-end gap-2">
                <input id="chat-files" type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                <Button type="button" variant="secondary" className="h-11 w-11 px-0" onClick={() => document.getElementById("chat-files").click()} aria-label="Attach files"><Paperclip className="h-4 w-4" /></Button>
                <div className="relative flex-1">
                  <textarea
                    className="focus-ring max-h-32 min-h-11 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Write a reply..."
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      realtime.typingStart(selectedId);
                      window.clearTimeout(typingTimerRef.current);
                      typingTimerRef.current = window.setTimeout(() => realtime.typingStop(selectedId), 800);
                    }}
                  />
                  {showEmoji ? (
                    <div className="absolute bottom-14 right-0 grid grid-cols-6 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      {emojis.map((emoji) => <button type="button" key={emoji} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setContent((value) => `${value}${emoji}`)}>{emoji}</button>)}
                    </div>
                  ) : null}
                </div>
                <Button type="button" variant="secondary" className="h-11 w-11 px-0" onClick={() => setShowEmoji((value) => !value)} aria-label="Emoji picker"><Smile className="h-4 w-4" /></Button>
                <Button className="h-11 w-11 px-0" isLoading={uploadMutation.isPending} aria-label="Send"><Send className="h-4 w-4" /></Button>
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}
