import Joi from "joi";
import Message from "../models/Message.js";
import { getAccessibleConversation } from "../utils/accessControl.js";
import { notifyUsers } from "../utils/notifications.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { summarizeConversation } from "../utils/summarizer.js";

export const messageSchema = Joi.object({
  content: Joi.string().allow("").max(5000).default("")
});

export const reactionSchema = Joi.object({
  emoji: Joi.string().min(1).max(16).required()
});

export async function createMessage(req, res, next) {
  try {
    const conversation = await getAccessibleConversation(req.params.conversationId, req.user);
    const attachments = (req.files || []).map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    if (!req.body.content && !attachments.length) {
      const error = new Error("Message content or attachment is required");
      error.statusCode = 400;
      throw error;
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: req.body.content || "",
      attachments,
      readStatus: [{ user: req.user._id }]
    });

    if (req.user.role !== "customer" && !conversation.firstResponseAt) {
      conversation.firstResponseAt = new Date();
    }
    conversation.lastMessageAt = new Date();
    const recent = await Message.find({ conversationId: conversation._id }).sort({ timestamp: -1 }).limit(8);
    conversation.summary = summarizeConversation(recent.reverse());
    await conversation.save();

    const populated = await message.populate("senderId", "name email avatar role");
    req.app.get("io")?.to(`conversation:${conversation._id}`).emit("message:new", populated);
    await notifyUsers(req.app.get("io"), conversation.participants.filter((id) => String(id) !== String(req.user._id)), {
      type: "message",
      title: `New reply from ${req.user.name}`,
      body: populated.content || "Attachment received",
      conversationId: conversation._id
    });
    res.status(201).json({ message: populated });
  } catch (error) {
    next(error);
  }
}

export async function searchMessages(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) return res.json({ messages: [] });
    const { page, limit, skip } = getPagination(req.query, { limit: 25, maxLimit: 50 });
    const messages = await Message.find({ $text: { $search: q } })
      .populate("senderId", "name email avatar role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    const visible = [];
    for (const message of messages) {
      try {
        await getAccessibleConversation(message.conversationId, req.user);
        visible.push(message);
      } catch {
        // Keep search results scoped to conversations the user can read.
      }
    }
    res.json({ messages: visible, pagination: paginationMeta(visible.length, page, limit) });
  } catch (error) {
    next(error);
  }
}

export async function toggleReaction(req, res, next) {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      throw error;
    }
    await getAccessibleConversation(message.conversationId, req.user);
    const existingIndex = message.reactions.findIndex(
      (reaction) => reaction.emoji === req.body.emoji && String(reaction.user) === String(req.user._id)
    );
    if (existingIndex >= 0) message.reactions.splice(existingIndex, 1);
    else message.reactions.push({ emoji: req.body.emoji, user: req.user._id });
    await message.save();
    const populated = await message.populate("reactions.user", "name avatar");
    req.app.get("io")?.to(`conversation:${message.conversationId}`).emit("message:reaction", populated);
    res.json({ message: populated });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    const conversation = await getAccessibleConversation(req.params.conversationId, req.user);
    await Message.updateMany(
      {
        conversationId: conversation._id,
        "readStatus.user": { $ne: req.user._id }
      },
      { $push: { readStatus: { user: req.user._id, readAt: new Date() } } }
    );
    req.app.get("io")?.to(`conversation:${conversation._id}`).emit("message:read", {
      conversationId: conversation._id,
      userId: req.user._id,
      readAt: new Date()
    });
    res.json({ message: "Marked as read" });
  } catch (error) {
    next(error);
  }
}
