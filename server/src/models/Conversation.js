import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    category: {
      type: String,
      enum: ["technical", "billing", "general", "feedback"],
      default: "general"
    },
    status: {
      type: String,
      enum: ["open", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed"],
      default: "open"
    },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    summary: { type: String, default: "" },
    suggestedReplies: [{ type: String, maxlength: 500 }],
    aiSignals: {
      sentiment: { type: String, enum: ["positive", "neutral", "negative"], default: "neutral" },
      urgencyScore: { type: Number, default: 0 },
      reason: { type: String, default: "" }
    },
    firstResponseAt: { type: Date, default: null },
    lastMessageAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ assignedAgent: 1, status: 1 });
conversationSchema.index({ subject: "text", category: "text", summary: "text" });

export default mongoose.model("Conversation", conversationSchema);
