import Joi from "joi";
import { Router } from "express";
import { analytics, deleteUser, listAuditLogs, listUsers, securityOverview, systemConfig, transferOwnership, updateUserApproval, updateUserDisabled, updateUserRole } from "../controllers/adminController.js";
import { allowRoles, protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { roles } from "../utils/roles.js";

const router = Router();
const roleSchema = Joi.object({ role: Joi.string().valid(...roles).required() });
const approvalSchema = Joi.object({ approvalStatus: Joi.string().valid("pending", "approved", "rejected").required() });
const disabledSchema = Joi.object({ disabled: Joi.boolean().required() });

router.use(protect, allowRoles("admin"));
router.get("/analytics", analytics);
router.get("/audit-logs", listAuditLogs);
router.get("/security", securityOverview);
router.get("/system-config", systemConfig);
router.get("/users", listUsers);
router.patch("/users/:id/role", validate(roleSchema), updateUserRole);
router.patch("/users/:id/approval", validate(approvalSchema), updateUserApproval);
router.patch("/users/:id/disabled", validate(disabledSchema), updateUserDisabled);
router.patch("/users/:id/transfer-ownership", transferOwnership);
router.delete("/users/:id", deleteUser);

export default router;
