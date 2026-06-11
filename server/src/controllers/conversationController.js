import Joi from "joi";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Rating from "../models/Rating.js";
import User from "../models/User.js";
import { assignAgent } from "../utils/assignment.js";
import { canAccessConversation, getAccessibleConversation, getManageableConversation } from "../utils/accessControl.js";
import { classifyTicket, suggestReplies } from "../utils/aiEngine.js";
import { categorizeConversation } from "../utils/categorizer.js";
import { notifyUsers } from "../utils/notifications.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { recordAuditLog } from "../utils/audit.js";
import { ensureSuperAdmin, isAdminRole } from "../utils/roles.js";
import { summarizeConversation } from "../utils/summarizer.js";

export const createConversationSchema = Joi.object({
  subject: Joi.string().min(3).max(160).required(),
  content: Joi.string().min(1).max(5000).required(),
  category: Joi.string().valid("technical", "billing", "general", "feedback").optional()
});

export const statusSchema = Joi.object({
  status: Joi.string().valid("open", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed").required()
});

export const assignmentSchema = Joi.object({
  agentId: Joi.string().allow("", null).optional()
});

const statusTransitions = {
  open: ["assigned", "in_progress", "closed"],
  assigned: ["open", "in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: ["open"]
};

function participantQuery(user) {
  if (isAdminRole(user)) return {};
  if (user.role === "agent") return user.approvalStatus === "approved" ? { assignedAgent: user._id } : { _id: null };
  return { participants: user._id };
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildConversationSearch(q) {
  const trimmed = String(q || "").trim();
  if (!trimmed) return [];
  const safeQuery = escapeRegex(trimmed);
  const regex = new RegExp(safeQuery, "i");
  const users = await User.find({
    $or: [
      { name: regex },
      { email: regex },
      { company: regex }
    ]
  }).select("_id").limit(50);
  const userIds = users.map((user) => user._id);
  const search = [
    { subject: regex },
    { category: regex },
    { summary: regex },
    { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: safeQuery, options: "i" } } }
  ];
  if (mongoose.Types.ObjectId.isValid(trimmed)) search.push({ _id: trimmed });
  if (userIds.length) {
    search.push({ participants: { $in: userIds } });
    search.push({ assignedAgent: { $in: userIds } });
  }
  return search;
}

export async function listConversations(req, res, next) {
  try {
    const { q, status, category } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 25, maxLimit: 100 });
    const query = { ...participantQuery(req.user) };
    if (status) query.status = status;
    if (category) query.category = category;
    const search = await buildConversationSearch(q);
    if (search.length) query.$or = search;

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate("participants", "name email company customerStatus avatar role status lastSeenAt lastActivityAt")
        .populate("assignedAgent", "name email company avatar role status")
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(query)
    ]);

    const hydrated = await Promise.all(conversations.map(async (conversation) => {
      const [lastMessage, unreadCount] = await Promise.all([
        Message.findOne({ conversationId: conversation._id }).sort({ timestamp: -1 }).select("content attachments timestamp senderId"),
        Message.countDocuments({ conversationId: conversation._id, "readStatus.user": { $ne: req.user._id } })
      ]);
      const clean = conversation.toObject();
      clean.lastMessagePreview = lastMessage?.content || (lastMessage?.attachments?.length ? "Attachment received" : "");
      clean.unreadCount = unreadCount;
      return clean;
    }));

    res.json({ conversations: hydrated, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const assignedAgent = await assignAgent();
    const ai = classifyTicket(`${req.body.subject} ${req.body.content}`);
    const category = req.body.category || categorizeConversation(`${req.body.subject} ${req.body.content}`);
    const participants = [req.user._id, assignedAgent].filter(Boolean);

    const conversation = await Conversation.create({
      subject: req.body.subject,
      participants,
      assignedAgent,
      category,
      priority: ai.priority,
      status: assignedAgent ? "assigned" : "open",
      suggestedReplies: suggestReplies({ category, priority: ai.priority, subject: req.body.subject }),
      aiSignals: { sentiment: ai.sentiment, urgencyScore: ai.urgencyScore, reason: ai.reason },
      lastMessageAt: new Date()
    });

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: req.body.content,
      readStatus: [{ user: req.user._id }]
    });

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name email company customerStatus avatar role status")
      .populate("assignedAgent", "name email company avatar role status");

    const io = req.app.get("io");
    participants.forEach((id) => io?.to(`user:${id}`).emit("conversation:new", populated));
    io?.to("role:admin").emit("conversation:new", populated);
    io?.to("role:super_admin").emit("conversation:new", populated);
    await notifyUsers(io, participants.filter((id) => String(id) !== String(req.user._id)), {
      type: "conversation",
      title: "New conversation assigned",
      body: populated.subject,
      conversationId: populated._id
    });

    res.status(201).json({ conversation: populated, message });
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "name email company customerStatus avatar role status lastSeenAt lastActivityAt")
      .populate("assignedAgent", "name email company avatar role status lastSeenAt");

    if (!conversation) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }

    if (!canAccessConversation(conversation, req.user)) {
      const error = new Error("Access denied");
      error.statusCode = 403;
      throw error;
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .populate("senderId", "name email avatar role")
      .populate("reactions.user", "name avatar")
      .sort({ timestamp: 1 });
    const rating = await Rating.findOne({ conversationId: conversation._id, customerId: req.user._id });

    res.json({ conversation, messages, rating });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can change ticket workflow");
    const conversation = await getManageableConversation(req.params.id, req.user);
    const nextStatus = req.body.status;
    const allowed = statusTransitions[conversation.status] || [];
    if (nextStatus !== conversation.status && !allowed.includes(nextStatus)) {
      const error = new Error(`Cannot move ticket from ${conversation.status} to ${nextStatus}`);
      error.statusCode = 400;
      throw error;
    }
    if (nextStatus === "assigned" && !conversation.assignedAgent) {
      const error = new Error("Assign an agent before moving this ticket to Assigned");
      error.statusCode = 400;
      throw error;
    }

    const previousStatus = conversation.status;
    conversation.status = nextStatus;
    conversation.closedAt = ["resolved", "closed"].includes(nextStatus) ? new Date() : null;
    await conversation.save();
    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name email company customerStatus avatar role status")
      .populate("assignedAgent", "name email company avatar role status");

    req.app.get("io")?.to(`conversation:${conversation._id}`).emit("conversation:update", populated);
    req.app.get("io")?.to("role:admin").emit("conversation:update", populated);
    req.app.get("io")?.to("role:super_admin").emit("conversation:update", populated);
    await notifyUsers(req.app.get("io"), conversation.participants, {
      type: "status",
      title: `Ticket ${nextStatus}`,
      body: conversation.subject,
      conversationId: conversation._id
    });
    await recordAuditLog(req, {
      action: "ticket_status_changed",
      resourceType: "conversation",
      resourceId: conversation._id,
      metadata: { previousStatus, nextStatus }
    });
    res.json({ conversation: populated });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignment(req, res, next) {
  const context = {
    conversationId: req.params.id,
    agentId: req.body.agentId || null,
    actorId: req.user?._id,
    actorRole: req.user?.role
  };
  try {
    console.info("[assignment] Assignment request received", context);
    ensureSuperAdmin(req.user, "Only Super Admins can assign conversations");

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }

    const previousAgent = conversation.assignedAgent ? String(conversation.assignedAgent) : null;
    const nextAgentId = req.body.agentId || null;
    let nextAgent = null;

    if (nextAgentId) {
      if (!mongoose.Types.ObjectId.isValid(nextAgentId)) {
        const error = new Error("Invalid agent id");
        error.statusCode = 400;
        throw error;
      }
      nextAgent = await User.findOne({ _id: nextAgentId, role: "agent", approvalStatus: "approved", disabled: false });
      if (!nextAgent) {
        const error = new Error("Selected agent is not approved or is unavailable");
        error.statusCode = 400;
        throw error;
      }
    }

    const customerParticipantIds = [];
    for (const id of conversation.participants) {
      const participant = await User.findById(id).select("role");
      if (participant?.role !== "agent") customerParticipantIds.push(id);
    }
    conversation.participants = nextAgent ? [...customerParticipantIds, nextAgent._id] : customerParticipantIds;
    conversation.assignedAgent = nextAgent?._id || null;
    if (nextAgent && conversation.status === "open") conversation.status = "assigned";
    if (!nextAgent && conversation.status === "assigned") conversation.status = "open";
    await conversation.save();
    console.info("[assignment] Conversation assignment saved", {
      ...context,
      previousAgent,
      nextAgent: nextAgent?._id || null,
      participantCount: conversation.participants.length,
      status: conversation.status
    });

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name email company customerStatus avatar role status lastSeenAt lastActivityAt")
      .populate("assignedAgent", "name email company avatar role status lastSeenAt lastActivityAt");

    const io = req.app.get("io");
    try {
      io?.to(`conversation:${conversation._id}`).emit("conversation:update", populated);
      populated.participants.forEach((participant) => io?.to(`user:${participant._id}`).emit("conversation:update", populated));
      if (previousAgent && previousAgent !== String(nextAgent?._id || "")) io?.to(`user:${previousAgent}`).emit("conversation:update", populated);
      io?.to("role:admin").emit("conversation:update", populated);
      io?.to("role:super_admin").emit("conversation:update", populated);
      console.info("[assignment] Realtime assignment broadcast sent", context);
    } catch (broadcastError) {
      console.error("[assignment] Realtime assignment broadcast failed", { ...context, error: broadcastError.message });
    }

    if (nextAgent) {
      try {
        await notifyUsers(io, [nextAgent._id], {
          type: "assignment",
          title: "Conversation assigned to you",
          body: populated.subject,
          conversationId: populated._id
        });
        console.info("[assignment] Assignment notification created", { ...context, assignedAgentId: String(nextAgent._id) });
      } catch (notificationError) {
        console.error("[assignment] Assignment notification failed", { ...context, error: notificationError.message });
      }
    }

    await recordAuditLog(req, {
      action: "conversation_assignment_changed",
      resourceType: "conversation",
      resourceId: conversation._id,
      targetUser: nextAgent,
      metadata: {
        previousAgent,
        nextAgent: nextAgent ? String(nextAgent._id) : null,
        status: conversation.status
      }
    });
    res.json({ conversation: populated });
  } catch (error) {
    console.error("[assignment] Assignment failed", { ...context, error: error.message, stack: error.stack });
    next(error);
  }
}

export async function summarize(req, res, next) {
  try {
    await getAccessibleConversation(req.params.id, req.user);
    const messages = await Message.find({ conversationId: req.params.id }).sort({ timestamp: 1 });
    const summary = summarizeConversation(messages);
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { summary },
      { new: true }
    );
    res.json({ summary, conversation });
  } catch (error) {
    next(error);
  }
}
