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
  } catch {
    // Audio can be blocked before user gesture.
  }
}

export function useSocket({ onMessage, onConversationUpdate, onReaction, onRead, onNotification } = {}) {
  const token = useAuthStore((state) => state.token);
  const pushToast = useUiStore((state) => state.pushToast);
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on("presence:list", setOnlineUsers);
    socket.on("presence:update", ({ userId, status }) => {
      setOnlineUsers((users) => status === "online"
        ? [...new Set([...users, userId])]
        : users.filter((id) => id !== userId));
    });
    socket.on("message:new", (message) => {
      onMessage?.(message);
      pushToast({ type: "message", title: "New message", body: message.content || "Attachment received" });
      notify("SupportFlow AI", message.content || "Attachment received");
      playPing();
    });
    socket.on("message:reaction", onReaction || (() => {}));
    socket.on("message:read", onRead || (() => {}));
    socket.on("conversation:update", onConversationUpdate || (() => {}));
    socket.on("notification:new", (notification) => {
      onNotification?.(notification);
      pushToast({ type: "notification", title: notification.title, body: notification.body });
      notify(notification.title, notification.body);
    });

    return () => {
      socket.disconnect();
      setSocketInstance(null);
      socketRef.current = null;
    };
  }, [token, onMessage, onConversationUpdate, pushToast]);

  const join = useCallback((id) => socketRef.current?.emit("conversation:join", id), []);
  const leave = useCallback((id) => socketRef.current?.emit("conversation:leave", id), []);
  const sendMessage = useCallback((payload) => new Promise((resolve) => socketRef.current?.emit("message:send", payload, resolve)), []);
  const typingStart = useCallback((conversationId) => socketRef.current?.emit("typing:start", { conversationId }), []);
  const typingStop = useCallback((conversationId) => socketRef.current?.emit("typing:stop", { conversationId }), []);
  const markRead = useCallback((conversationId) => socketRef.current?.emit("message:read", { conversationId }), []);

  return useMemo(() => ({
    socket: socketInstance,
    onlineUsers,
    join,
    leave,
    sendMessage,
    typingStart,
    typingStop,
    markRead
  }), [onlineUsers, socketInstance, join, leave, sendMessage, typingStart, typingStop, markRead]);
}
