import { Router } from "express";
import { rateConversation, ratingSchema } from "../controllers/ratingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/:conversationId", protect, validate(ratingSchema), rateConversation);

export default router;
