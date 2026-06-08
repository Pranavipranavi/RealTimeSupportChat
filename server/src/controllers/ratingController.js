import Joi from "joi";
import Conversation from "../models/Conversation.js";
import Rating from "../models/Rating.js";

export const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  feedback: Joi.string().allow("").max(1000).default("")
});

export async function rateConversation(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (req.user.role !== "customer" || !conversation || !conversation.participants.some((id) => String(id) === String(req.user._id))) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }
    if (!["resolved", "closed"].includes(conversation.status)) {
      const error = new Error("Only resolved or closed conversations can be rated");
      error.statusCode = 400;
      throw error;
    }

    const rating = await Rating.findOneAndUpdate(
      { conversationId: conversation._id, customerId: req.user._id },
      {
        conversationId: conversation._id,
        customerId: req.user._id,
        agentId: conversation.assignedAgent,
        rating: req.body.rating,
        feedback: req.body.feedback
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ rating });
  } catch (error) {
    next(error);
  }
}
