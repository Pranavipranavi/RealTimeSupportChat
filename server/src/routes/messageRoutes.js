import { Router } from "express";
import { createMessage, markRead, messageSchema, reactionSchema, searchMessages, toggleReaction } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(protect);
router.get("/search", searchMessages);
router.post("/:conversationId", upload.array("attachments", 5), validate(messageSchema), createMessage);
router.post("/:conversationId/read", markRead);
router.post("/:messageId/reactions", validate(reactionSchema), toggleReaction);

export default router;
