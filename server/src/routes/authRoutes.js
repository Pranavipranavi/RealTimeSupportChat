import { Router } from "express";
import { forgotPassword, forgotPasswordSchema, googleLogin, googleSchema, login, loginSchema, logout, me, profileSchema, register, registerSchema, resetPassword, resetPasswordSchema, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleSchema), googleLogin);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.get("/me", protect, me);
router.patch("/profile", protect, validate(profileSchema), updateProfile);
router.post("/logout", protect, logout);

export default router;
