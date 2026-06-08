import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, trim: true, maxlength: 1000, default: "" }
  },
  { timestamps: true }
);

ratingSchema.index({ conversationId: 1, customerId: 1 }, { unique: true });

export default mongoose.model("Rating", ratingSchema);
