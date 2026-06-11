import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";

function notify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") new Notification(title, { body });
}

function playPing() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 720;
    gain.gain.value = 0.025;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
    oscillator.addEventListener("ended", () => ctx.close());
  } catch {
    // Audio can be blocked before user gesture.
  }
}

function sameUserList(a = [], b = []) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function useSocket({ onMessage, onConversationUpdate, onReaction, onRead, onNotification, notifyOnMessage = false } = {}) {
  const token = useAuthStore((state) => state.token);
  const pushToast = useUiStore((state) => state.pushToast);
  const socketRef = useRef(null);
  const callbacksRef = useRef({});
  const [socketInstance, setSocketInstance] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    callbacksRef.current = { onMessage, onConversationUpdate, onReaction, onRead, onNotification, notifyOnMessage };
  }, [onMessage, onConversationUpdate, onReaction, onRead, onNotification, notifyOnMessage]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000
    });
    socketRef.current = socket;
    setSocketInstance(socket);
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handlePresenceList = (users = []) => {
      setOnlineUsers((current) => sameUserList(current, users) ? current : users);
    };
    const handlePresenceUpdate = ({ userId, status }) => {
      setOnlineUsers((users) => {
        const next = status === "online"
          ? [...new Set([...users, userId])]
          : users.filter((id) => id !== userId);
        return sameUserList(users, next) ? users : next;
      });
    };
    const handleMessage = (message) => {
      callbacksRef.current.onMessage?.(message);
      if (callbacksRef.current.notifyOnMessage) {
        pushToast({ type: "message", title: "New message", body: message.content || "Attachment received" });
        notify("SupaNova AI", message.content || "Attachment received");
        playPing();
      }
    };
    const handleReaction = (message) => callbacksRef.current.onReaction?.(message);
    const handleRead = (payload) => callbacksRef.current.onRead?.(payload);
    const handleConversationUpdate = (conversation) => callbacksRef.current.onConversationUpdate?.(conversation);
    const handleNotification = (notification) => {
      if (!callbacksRef.current.onNotification) return;
      callbacksRef.current.onNotification(notification);
      pushToast({ type: "notification", title: notification.title, body: notification.body });
      notify(notification.title, notification.body);
    };

    socket.on("presence:list", handlePresenceList);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message:new", handleMessage);
    socket.on("message:reaction", handleReaction);
    socket.on("message:read", handleRead);
    socket.on("conversation:update", handleConversationUpdate);
    socket.on("conversation:new", handleConversationUpdate);
    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("presence:list", handlePresenceList);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message:new", handleMessage);
      socket.off("message:reaction", handleReaction);
      socket.off("message:read", handleRead);
      socket.off("conversation:update", handleConversationUpdate);
      socket.off("conversation:new", handleConversationUpdate);
      socket.off("notification:new", handleNotification);
      socket.disconnect();
      setSocketInstance(null);
      setIsConnected(false);
      socketRef.current = null;
    };
  }, [token, pushToast]);

  const join = useCallback((id) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket || !id) {
      resolve({ ok: false, message: "Realtime connection is not ready" });
      return;
    }
    socket.timeout(5000).emit("conversation:join", id, (error, response) => {
      resolve(error ? { ok: false, message: "Realtime room join timed out" } : response);
    });
  }), []);
  const leave = useCallback((id) => socketRef.current?.emit("conversation:leave", id), []);
  const sendMessage = useCallback((payload) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, message: "Realtime connection is still connecting. Please try again in a moment." });
      return;
    }
    socket.timeout(8000).emit("message:send", payload, (error, response) => {
      resolve(error ? { ok: false, message: "Message send timed out. Please retry." } : response);
    });
  }), []);
  const typingStart = useCallback((conversationId) => {
    if (conversationId && socketRef.current?.connected) socketRef.current.emit("typing:start", { conversationId });
  }, []);
  const typingStop = useCallback((conversationId) => {
    if (conversationId && socketRef.current?.connected) socketRef.current.emit("typing:stop", { conversationId });
  }, []);
  const markRead = useCallback((conversationId) => {
    if (conversationId && socketRef.current?.connected) socketRef.current.emit("message:read", { conversationId });
  }, []);
  const setPresence = useCallback((status) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit(status === "away" ? "presence:away" : "presence:active");
  }, []);

  return useMemo(() => ({
    socket: socketInstance,
    isConnected,
    onlineUsers,
    join,
    leave,
    sendMessage,
    typingStart,
    typingStop,
    markRead,
    setPresence
  }), [onlineUsers, socketInstance, isConnected, join, leave, sendMessage, typingStart, typingStop, markRead, setPresence]);
}
