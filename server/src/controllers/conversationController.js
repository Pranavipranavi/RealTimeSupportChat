import Joi from "joi";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Rating from "../models/Rating.js";
import { assignAgent } from "../utils/assignment.js";
import { canAccessConversation, getAccessibleConversation, getManageableConversation } from "../utils/accessControl.js";
import { categorizeConversation } from "../utils/categorizer.js";
import { notifyUsers } from "../utils/notifications.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { summarizeConversation } from "../utils/summarizer.js";

export const createConversationSchema = Joi.object({
  subject: Joi.string().min(3).max(160).required(),
  content: Joi.string().min(1).max(5000).required(),
  category: Joi.string().valid("technical", "billing", "general", "feedback").optional()
});

export const statusSchema = Joi.object({
  status: Joi.string().valid("open", "pending", "resolved", "closed").required()
});

function participantQuery(user) {
  if (user.role === "admin") return {};
  if (user.role === "agent") return { assignedAgent: user._id };
  return { participants: user._id };
}

export async function listConversations(req, res, next) {
  try {
    const { q, status, category } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 25, maxLimit: 100 });
    const query = { ...participantQuery(req.user) };
    if (status) query.status = status;
    if (category) query.category = category;
    if (q) query.$text = { $search: q };

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate("participants", "name email avatar role status lastSeenAt")
        .populate("assignedAgent", "name email avatar role status")
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(query)
    ]);

    res.json({ conversations, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const assignedAgent = await assignAgent();
    const category = req.body.category || categorizeConversation(`${req.body.subject} ${req.body.content}`);
    const participants = [req.user._id, assignedAgent].filter(Boolean);

    const conversation = await Conversation.create({
      subject: req.body.subject,
      participants,
      assignedAgent,
      category,
      status: "open",
      lastMessageAt: new Date()
    });

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: req.body.content,
      readStatus: [{ user: req.user._id }]
    });

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar role status")
      .populate("assignedAgent", "name email avatar role status");

    const io = req.app.get("io");
    participants.forEach((id) => io?.to(`user:${id}`).emit("conversation:new", populated));
    io?.to("role:admin").emit("conversation:new", populated);
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
      .populate("participants", "name email avatar role status lastSeenAt")
      .populate("assignedAgent", "name email avatar role status lastSeenAt");

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
    const conversation = await getManageableConversation(req.params.id, req.user);

    conversation.status = req.body.status;
    conversation.closedAt = ["resolved", "closed"].includes(req.body.status) ? new Date() : null;
    await conversation.save();
    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar role status")
      .populate("assignedAgent", "name email avatar role status");

    req.app.get("io")?.to(`conversation:${conversation._id}`).emit("conversation:update", populated);
    await notifyUsers(req.app.get("io"), conversation.participants, {
      type: "status",
      title: `Ticket ${req.body.status}`,
      body: conversation.subject,
      conversationId: conversation._id
    });
    res.json({ conversation: populated });
  } catch (error) {
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
