import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, LockKeyhole, Paperclip, Search, Send, Smile, Sparkles, Star } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, assetUrl } from "../../api/client.js";
import { Button } from "../../components/ui/Button.jsx";
import { EmptyState, ErrorState, SkeletonList } from "../../components/ui/State.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { PresenceBadge } from "../../components/ui/PresenceBadge.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useSocket } from "../../hooks/useSocket.js";
import { useAuthStore } from "../../store/authStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { formatDate } from "../../utils/format.js";
import { isAdminRole, isSuperAdminRole, statusOptionsFor } from "../../utils/product.js";

const emojis = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F389}", "\u{1F64F}", "\u{1F440}"];
const NEAR_BOTTOM_PX = 140;

function customerFor(conversation) {
  return conversation?.participants?.find((participant) => participant.role === "customer");
}

function LockedModifyNotice() {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <LockKeyhole className="h-4 w-4" />
      Only Super Admin can modify this
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({ message, currentUserId, onReact }) {
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
});

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
  const [hasUnreadWhileReading, setHasUnreadWhileReading] = useState(false);
  const messageListRef = useRef(null);
  const composerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const activeConversationRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingActiveRef = useRef(false);

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations", user?.role, debouncedQ],
    queryFn: () => api.get(`/api/conversations${debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : ""}`)
  });
  const conversations = Array.isArray(conversationsQuery.data?.conversations) ? conversationsQuery.data.conversations : [];
  const selectedId = conversationId || conversations[0]?._id;
  const detailQuery = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () => api.get(`/api/conversations/${selectedId}`),
    enabled: Boolean(selectedId)
  });
  const conversation = detailQuery.data?.conversation || null;
  const messages = Array.isArray(detailQuery.data?.messages) ? detailQuery.data.messages : [];
  const customer = customerFor(conversation);
  const agentsQuery = useQuery({
    queryKey: ["approved-agents"],
    queryFn: () => api.get("/api/admin/users?role=agent&approvalStatus=approved&limit=100"),
    enabled: isSuperAdminRole(user?.role)
  });
  const agents = agentsQuery.data?.users?.filter((agent) => !agent.disabled) || [];

  const appendMessage = useCallback((message) => {
    const messageConversationId = String(message.conversationId?._id || message.conversationId);
    queryClient.setQueryData(["conversation", messageConversationId], (old) => {
      if (!old) return old;
      if (old.messages.some((item) => item._id === message._id)) return old;
      return { ...old, messages: [...old.messages, message] };
    });
  }, [queryClient]);

  const onMessage = useCallback((message) => {
    appendMessage(message);
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
  }, [appendMessage, queryClient]);

  const onConversationUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
  }, [queryClient, selectedId]);
  const onReaction = useCallback((message) => {
    const messageConversationId = String(message.conversationId?._id || message.conversationId);
    queryClient.setQueryData(["conversation", messageConversationId], (old) => old ? {
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
    if (!realtime.isConnected) return undefined;
    realtime.join(selectedId);
    realtime.markRead(selectedId);
    return () => {
      window.clearTimeout(typingTimerRef.current);
      typingActiveRef.current = false;
      realtime.typingStop(selectedId);
      realtime.leave(selectedId);
    };
  }, [selectedId, realtime.isConnected, realtime.join, realtime.leave, realtime.markRead, realtime.typingStop]);

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

  const scrollToBottom = useCallback((behavior = "smooth") => {
    window.requestAnimationFrame(() => {
      const element = messageListRef.current;
      if (!element) return;
      element.scrollTo({ top: element.scrollHeight, behavior });
      isNearBottomRef.current = true;
      setHasUnreadWhileReading(false);
    });
  }, []);

  const handleMessageListScroll = useCallback(() => {
    const element = messageListRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setHasUnreadWhileReading(false);
  }, []);

  useEffect(() => {
    if (!selectedId || !messages.length) return;
    const switchedConversation = activeConversationRef.current !== selectedId;
    activeConversationRef.current = selectedId;
    const latestMessage = messages[messages.length - 1];
    const latestMessageId = latestMessage?._id || `${latestMessage?.timestamp || ""}-${latestMessage?.senderId?._id || latestMessage?.senderId || ""}`;
    if (switchedConversation) {
      isNearBottomRef.current = true;
      lastMessageIdRef.current = latestMessageId;
      setHasUnreadWhileReading(false);
      scrollToBottom("auto");
      return;
    }
    if (latestMessageId && latestMessageId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = latestMessageId;
    const latestIsMine = String(latestMessage.senderId?._id || latestMessage.senderId) === String(user?._id);
    if (isNearBottomRef.current || latestIsMine) {
      scrollToBottom("smooth");
      return;
    }
    setHasUnreadWhileReading(true);
  }, [messages, scrollToBottom, selectedId, user?._id]);

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
    },
    onError: (error) => pushToast({ title: "Status update failed", body: error.message })
  });
  const assignmentMutation = useMutation({
    mutationFn: (agentId) => api.patch(`/api/conversations/${selectedId}/assignment`, { agentId }),
    onSuccess: ({ conversation: updatedConversation }) => {
      console.info("[assignment] Assignment saved from conversation detail", {
        conversationId: updatedConversation._id,
        assignedAgent: updatedConversation.assignedAgent?._id || null
      });
      queryClient.setQueryData(["conversation", selectedId], (old) => old ? { ...old, conversation: updatedConversation } : old);
      queryClient.setQueriesData({ queryKey: ["chat-conversations"] }, (old) => old?.conversations ? {
        ...old,
        conversations: old.conversations.map((item) => item._id === updatedConversation._id ? { ...item, ...updatedConversation } : item)
      } : old);
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      pushToast({ title: "Assignment updated", body: "The agent has been notified." });
    },
    onError: (error) => {
      console.error("[assignment] Assignment failed from conversation detail", { conversationId: selectedId, error: error.message });
      pushToast({ title: "Assignment failed", body: error.message });
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
  const handleReact = useCallback((messageId, emoji) => {
    reactionMutation.mutate({ messageId, emoji });
  }, [reactionMutation.mutate]);

  const sendTextMessage = useCallback(async (text) => {
    const cleanText = String(text || "").trim();
    if (!cleanText || !selectedId) return;
    const result = await realtime.sendMessage({ conversationId: selectedId, content: cleanText });
    if (result?.ok) {
      appendMessage(result.message);
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setContent("");
      scrollToBottom("smooth");
    } else {
      pushToast({ title: "Message failed", body: result?.message || "Unable to send message." });
    }
  }, [appendMessage, pushToast, queryClient, realtime, scrollToBottom, selectedId]);

  const useSuggestion = useCallback((reply) => {
    setContent(reply);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  async function send(event) {
    event.preventDefault();
    if (!content.trim() && !files.length) return;
    if (!selectedId) {
      pushToast({ title: "Select a conversation", body: "Open a ticket before sending a message." });
      return;
    }
    window.clearTimeout(typingTimerRef.current);
    if (typingActiveRef.current) {
      realtime.typingStop(selectedId);
      typingActiveRef.current = false;
    }
    if (files.length) {
      const formData = new FormData();
      formData.append("content", content);
      files.forEach((file) => formData.append("attachments", file));
      uploadMutation.mutate(formData);
      return;
    }
    await sendTextMessage(content);
  }

  const routeBase = useMemo(() => {
    if (user?.role === "agent") return "/agent/chats";
    if (isAdminRole(user?.role)) return "/admin/conversations";
    return "/customer/chat";
  }, [user?.role]);

  const showConversationListError = conversationsQuery.isError && !conversations.length;
  const showConversationMissing = Boolean(selectedId) && !detailQuery.isLoading && !detailQuery.isError && !conversation;
  const canModifyTicket = isSuperAdminRole(user?.role);

  return (
    <div className="grid h-[calc(100dvh-6rem)] min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-dark-card sm:h-[calc(100dvh-7rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 overflow-hidden border-r border-slate-200 dark:border-slate-800 lg:flex lg:flex-col">
        <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search conversations" value={q} onChange={(event) => setQ(event.target.value)} /></div>
        </div>
        <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [scrollbar-gutter:stable]">
          {conversationsQuery.isLoading ? <SkeletonList rows={6} /> : null}
          {showConversationListError ? <ErrorState message={conversationsQuery.error.message} onRetry={conversationsQuery.refetch} /> : null}
          {!conversationsQuery.isLoading && !conversationsQuery.isError && !conversations.length ? <EmptyState title="No chats" body="Assigned conversations will appear here." /> : null}
          {conversations.map((item) => {
            const listCustomer = customerFor(item);
            return (
              <Link key={item._id} to={`${routeBase}/${item._id}`} className={`block border-b border-slate-100 p-4 transition dark:border-slate-800 ${item._id === selectedId ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-1 text-sm font-black">{item.subject}</h3>
                  {item.unreadCount ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-black text-white">{item.unreadCount}</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge value={item.status} />
                  <StatusBadge value={item.priority} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.lastMessagePreview || item.summary || "No messages yet."}</p>
                <div className="mt-3 space-y-1 text-xs font-semibold text-slate-400">
                  <p>Customer: {listCustomer?.name || "Unknown"}</p>
                  <p>Agent: {item.assignedAgent?.name || "Unassigned"}</p>
                  <p>{formatDate(item.lastMessageAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 p-3 dark:border-slate-800 lg:hidden">
          <select
            className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={selectedId || ""}
            onChange={(event) => {
              if (event.target.value) navigate(`${routeBase}/${event.target.value}`);
            }}
          >
            <option value="">Select conversation</option>
            {conversations.map((item) => <option key={item._id} value={item._id}>{item.subject}</option>)}
          </select>
        </div>
        {showConversationListError ? <ErrorState message={conversationsQuery.error.message} onRetry={conversationsQuery.refetch} /> : null}
        {!showConversationListError && !selectedId ? <EmptyState title="No conversations yet" body={user?.role === "customer" ? "Create a ticket from your dashboard and it will appear here." : "Assigned conversations will appear here when tickets are available."} /> : null}
        {selectedId && detailQuery.isLoading ? <SkeletonList rows={8} /> : null}
        {detailQuery.isError ? <ErrorState message={detailQuery.error.message} onRetry={detailQuery.refetch} /> : null}
        {showConversationMissing ? <EmptyState title="Conversation unavailable" body="This conversation may have been deleted, closed to your role, or no longer exists." /> : null}
        {conversation ? (
          <>
            <header className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black">{conversation.subject}</h2>
                    <StatusBadge value={conversation.category} />
                    <StatusBadge value={conversation.status} />
                    <StatusBadge value={conversation.priority} />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>Agent: {conversation.assignedAgent?.name || "Unassigned"}</span>
                    {conversation.assignedAgent ? <PresenceBadge status={conversation.assignedAgent.status} /> : null}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Customer: {customer?.name || "Unknown"}{customer?.company ? ` at ${customer.company}` : ""}
                    {customer ? <span className="ml-2"><PresenceBadge status={customer.status} /></span> : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canModifyTicket ? (
                    <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={conversation.assignedAgent?._id || ""} onChange={(event) => assignmentMutation.mutate(event.target.value || null)}>
                      <option value="">Unassigned</option>
                      {agents.map((agent) => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                    </select>
                  ) : null}
                  {canModifyTicket ? (
                    <select className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={conversation.status} onChange={(event) => statusMutation.mutate(event.target.value)}>
                      {statusOptionsFor(conversation.status).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  ) : null}
                  {!canModifyTicket && isAdminRole(user?.role) ? <LockedModifyNotice /> : null}
                  <Button variant="secondary" icon={Sparkles} isLoading={summaryMutation.isPending} onClick={() => summaryMutation.mutate()}>Summary</Button>
                </div>
              </div>
              {conversation.aiSignals?.reason || conversation.suggestedReplies?.length ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">SupaNova AI Assist</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{conversation.summary || conversation.aiSignals?.reason || "Local AI is ready to assist this ticket."}</p>
                  {conversation.suggestedReplies?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {conversation.suggestedReplies.map((reply) => (
                        <div
                          key={reply}
                          className="flex max-w-full items-center overflow-hidden rounded-lg border border-blue-200 bg-white text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-slate-950 dark:text-blue-300"
                        >
                          <button type="button" className="min-w-0 flex-1 px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-blue-500/10" onClick={() => useSuggestion(reply)}>
                            <span className="line-clamp-2">{reply}</span>
                          </button>
                          <button type="button" className="border-l border-blue-100 px-2 py-1.5 hover:bg-blue-50 dark:border-blue-500/20 dark:hover:bg-blue-500/10" onClick={() => sendTextMessage(reply)} aria-label="Send suggested reply">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
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

            <div className="relative min-h-0 flex-1 bg-slate-50 dark:bg-slate-950">
              <div ref={messageListRef} onScroll={handleMessageListScroll} className="scrollbar-soft h-full min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
                {!messages.length ? <EmptyState title="No messages yet" body="Send the first reply to start this conversation." /> : null}
                {messages.map((message) => (
                  <MessageBubble key={message._id} message={message} currentUserId={user?._id} onReact={handleReact} />
                ))}
                {typingUsers.length ? <p className="text-sm font-semibold text-slate-400">{typingUsers.map((item) => item.name).join(", ")} typing...</p> : null}
              </div>
              {hasUnreadWhileReading ? (
                <button
                  type="button"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-600"
                  onClick={() => scrollToBottom("smooth")}
                >
                  New Messages ↓
                </button>
              ) : null}
            </div>

            {user?.role === "customer" && ["resolved", "closed"].includes(conversation.status) ? (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-dark-card">
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

            <form onSubmit={send} className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-dark-card">
              {files.length ? <p className="mb-2 text-xs font-semibold text-slate-500">{files.length} attachment(s) selected</p> : null}
              <div className="flex items-end gap-2">
                <input id="chat-files" type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                <Button type="button" variant="secondary" className="h-11 w-11 px-0" onClick={() => document.getElementById("chat-files").click()} aria-label="Attach files"><Paperclip className="h-4 w-4" /></Button>
                <div className="relative flex-1">
                  <textarea
                    ref={composerRef}
                    className="focus-ring max-h-32 min-h-11 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Write a reply..."
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      if (selectedId && realtime.isConnected && !typingActiveRef.current) {
                        typingActiveRef.current = true;
                        realtime.typingStart(selectedId);
                      }
                      window.clearTimeout(typingTimerRef.current);
                      typingTimerRef.current = window.setTimeout(() => {
                        realtime.typingStop(selectedId);
                        typingActiveRef.current = false;
                      }, 800);
                    }}
                  />
                  {showEmoji ? (
                    <div className="absolute bottom-14 right-0 grid grid-cols-6 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      {emojis.map((emoji) => <button type="button" key={emoji} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setContent((value) => `${value}${emoji}`)}>{emoji}</button>)}
                    </div>
                  ) : null}
                </div>
                <Button type="button" variant="secondary" className="h-11 w-11 px-0" onClick={() => setShowEmoji((value) => !value)} aria-label="Emoji picker"><Smile className="h-4 w-4" /></Button>
                <Button className="h-11 w-11 px-0" isLoading={uploadMutation.isPending} disabled={!selectedId || (!files.length && !realtime.isConnected)} aria-label="Send"><Send className="h-4 w-4" /></Button>
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}
