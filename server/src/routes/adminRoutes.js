import Joi from "joi";
import { Router } from "express";
import { analytics, listUsers, updateUserRole } from "../controllers/adminController.js";
import { allowRoles, protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();
const roleSchema = Joi.object({ role: Joi.string().valid("customer", "agent", "admin").required() });

router.use(protect, allowRoles("admin"));
router.get("/analytics", analytics);
router.get("/users", listUsers);
router.patch("/users/:id/role", validate(roleSchema), updateUserRole);

export default router;
