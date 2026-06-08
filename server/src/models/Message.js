import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    filename: String,
    mimetype: String,
    size: Number
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { _id: false, timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, maxlength: 5000, default: "" },
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
    readStatus: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now }
      }
    ],
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ content: "text" });

export default mongoose.model("Message", messageSchema);
