import { Router } from "express";
import { listNotifications, markNotificationsRead } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/", listNotifications);
router.post("/read", markNotificationsRead);

export default router;
