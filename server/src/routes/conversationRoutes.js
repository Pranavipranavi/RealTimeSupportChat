import { Router } from "express";
import { assignmentSchema, createConversation, createConversationSchema, getConversation, listConversations, statusSchema, summarize, updateAssignment, updateStatus } from "../controllers/conversationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(protect);
router.get("/", listConversations);
router.post("/", validate(createConversationSchema), createConversation);
router.get("/:id", getConversation);
router.patch("/:id/status", validate(statusSchema), updateStatus);
router.patch("/:id/assignment", validate(assignmentSchema), updateAssignment);
router.post("/:id/summary", summarize);

export default router;
