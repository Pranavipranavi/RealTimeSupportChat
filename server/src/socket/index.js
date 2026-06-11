import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { canAccessConversation, getAccessibleConversation } from "../utils/accessControl.js";
import { classifyTicket, suggestReplies } from "../utils/aiEngine.js";
import { notifyUsers } from "../utils/notifications.js";
import { verifyToken } from "../utils/tokens.js";
import { summarizeConversation } from "../utils/summarizer.js";

const onlineUsers = new Map();

function addOnlineSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId) || new Set();
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
}

function removeOnlineSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size) return true;
  onlineUsers.delete(userId);
  return false;
}

export function configureSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id);
      if (!user) return next(new Error("User not found"));
      if (user.disabled) return next(new Error("Account disabled"));
      socket.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    const userId = String(user._id);
    addOnlineSocket(userId, socket.id);
    socket.join(`user:${userId}`);
    socket.join(`role:${user.role}`);
    if (user.role === "super_admin") socket.join("role:admin");

    user.status = "online";
    user.lastSeenAt = new Date();
    await user.save();
    io.emit("presence:update", { userId, status: "online", lastSeenAt: user.lastSeenAt });
    socket.emit("presence:list", Array.from(onlineUsers.keys()));

    socket.on("conversation:join", async (conversationId, ack) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new Error("Conversation not found");
        if (!canAccessConversation(conversation, user)) throw new Error("Access denied");
        socket.join(`conversation:${conversationId}`);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, message: error.message });
      }
    });

    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        user: { _id: user._id, name: user.name, role: user.role }
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    async function updatePresence(status) {
      user.status = status;
      user.lastSeenAt = new Date();
      if (status === "online") user.lastActivityAt = new Date();
      await user.save();
      io.emit("presence:update", { userId, status, lastSeenAt: user.lastSeenAt });
    }

    socket.on("presence:active", () => {
      updatePresence("online").catch(() => {});
    });

    socket.on("presence:away", () => {
      updatePresence("away").catch(() => {});
    });

    socket.on("message:send", async ({ conversationId, content }, ack) => {
      try {
        const cleanContent = String(content || "").trim();
        if (!cleanContent) throw new Error("Message content is required");
        if (cleanContent.length > 5000) throw new Error("Message content is too long");
        const conversation = await getAccessibleConversation(conversationId, user);

        const message = await Message.create({
          conversationId,
          senderId: user._id,
          content: cleanContent,
          readStatus: [{ user: user._id }]
        });
        if (user.role !== "customer" && !conversation.firstResponseAt) {
          conversation.firstResponseAt = new Date();
        }
        conversation.lastMessageAt = new Date();
        const ai = classifyTicket(`${conversation.subject} ${cleanContent}`);
        conversation.priority = ai.priority === "urgent" ? "urgent" : conversation.priority;
        conversation.suggestedReplies = suggestReplies({ category: conversation.category, priority: conversation.priority, subject: conversation.subject });
        conversation.aiSignals = { sentiment: ai.sentiment, urgencyScore: ai.urgencyScore, reason: ai.reason };
        const recent = await Message.find({ conversationId }).sort({ timestamp: -1 }).limit(8);
        conversation.summary = summarizeConversation(recent.reverse());
        await conversation.save();
        const populated = await message.populate("senderId", "name email avatar role");
        const updatedConversation = await Conversation.findById(conversation._id)
          .populate("participants", "name email company customerStatus avatar role status lastSeenAt lastActivityAt")
          .populate("assignedAgent", "name email company avatar role status lastSeenAt");
        io.to(`conversation:${conversationId}`).emit("message:new", populated);
        io.to(`conversation:${conversationId}`).emit("conversation:update", updatedConversation);
        conversation.participants.forEach((id) => io.to(`user:${id}`).emit("conversation:update", updatedConversation));
        io.to("role:admin").emit("conversation:update", updatedConversation);
        io.to("role:super_admin").emit("conversation:update", updatedConversation);
        await notifyUsers(io, conversation.participants.filter((id) => String(id) !== userId), {
          type: "message",
          title: `New reply from ${user.name}`,
          body: cleanContent,
          conversationId
        });
        ack?.({ ok: true, message: populated });
      } catch (error) {
        ack?.({ ok: false, message: error.message });
      }
    });

    socket.on("message:read", async ({ conversationId }) => {
      try {
        await getAccessibleConversation(conversationId, user);
      } catch {
        return;
      }
      await Message.updateMany(
        { conversationId, "readStatus.user": { $ne: user._id } },
        { $push: { readStatus: { user: user._id, readAt: new Date() } } }
      );
      socket.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId,
        userId,
        readAt: new Date()
      });
    });

    socket.on("disconnect", async () => {
      const stillOnline = removeOnlineSocket(userId, socket.id);
      if (!stillOnline) {
        await User.findByIdAndUpdate(userId, { status: "offline", lastSeenAt: new Date() });
        io.emit("presence:update", { userId, status: "offline", lastSeenAt: new Date() });
      }
    });
  });
}
