import { classifyTicket } from "./aiEngine.js";

export function categorizeConversation(text = "") {
  return classifyTicket(text).category;
}
