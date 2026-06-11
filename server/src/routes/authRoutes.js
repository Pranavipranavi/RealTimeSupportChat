import { Router } from "express";
import { demoLogin, demoSchema, forgotPassword, forgotPasswordSchema, googleLogin, googleSchema, login, loginSchema, logout, me, passwordSchema, preferencesSchema, profileSchema, register, registerSchema, resetPassword, resetPasswordSchema, securitySchema, securityStatus, updatePassword, updatePreferences, updateProfile, updateSecurity } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleSchema), googleLogin);
router.post("/demo", validate(demoSchema), demoLogin);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.get("/me", protect, me);
router.patch("/profile", protect, validate(profileSchema), updateProfile);
router.patch("/password", protect, validate(passwordSchema), updatePassword);
router.patch("/preferences", protect, validate(preferencesSchema), updatePreferences);
router.get("/security", protect, securityStatus);
router.patch("/security", protect, validate(securitySchema), updateSecurity);
router.post("/logout", protect, logout);

export default router;
