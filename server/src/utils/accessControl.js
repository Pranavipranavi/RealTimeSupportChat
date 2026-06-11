import Conversation from "../models/Conversation.js";
import { isAdminRole } from "./roles.js";

export function canAccessConversation(conversation, user) {
  const userId = String(user._id);
  if (user.role === "agent" && user.approvalStatus !== "approved") return false;
  return isAdminRole(user)
    || String(conversation.assignedAgent?._id || conversation.assignedAgent) === userId
    || conversation.participants.some((participant) => String(participant._id || participant) === userId);
}

export function canManageConversation(conversation, user) {
  if (isAdminRole(user)) return true;
  if (user.role === "agent" && user.approvalStatus !== "approved") return false;
  return user.role === "agent" && String(conversation.assignedAgent?._id || conversation.assignedAgent) === String(user._id);
}

export async function getAccessibleConversation(conversationId, user) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }
  if (!canAccessConversation(conversation, user)) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }
  return conversation;
}

export async function getManageableConversation(conversationId, user) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }
  if (!canManageConversation(conversation, user)) {
    const error = new Error("Only the assigned agent or an admin can manage this ticket");
    error.statusCode = 403;
    throw error;
  }
  return conversation;
}
