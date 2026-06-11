import "../config/env.js";
import { OAuth2Client } from "google-auth-library";
import Joi from "joi";
import User from "../models/User.js";
import { recordAuditLog } from "../utils/audit.js";
import { signToken } from "../utils/tokens.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  company: Joi.string().allow("").max(120).default(""),
  role: Joi.string().valid("customer", "agent").default("customer"),
  securityQuestion: Joi.string().min(8).max(180).required(),
  securityAnswer: Joi.string().min(2).max(120).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const googleSchema = Joi.object({
  credential: Joi.string().required(),
  role: Joi.string().valid("customer", "agent").default("customer")
});

export const profileSchema = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  company: Joi.string().allow("").max(120).optional(),
  customerStatus: Joi.string().valid("prospect", "active", "vip", "at_risk").optional(),
  avatar: Joi.string().uri({ scheme: ["http", "https"] }).allow("").max(500).optional()
});

export const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  password: Joi.string().min(8).max(128).required()
});

export const preferencesSchema = Joi.object({
  notificationPreferences: Joi.object({
    browser: Joi.boolean().required(),
    sound: Joi.boolean().required(),
    emailDigest: Joi.boolean().required()
  }).required()
});

export const securitySchema = Joi.object({
  securityQuestion: Joi.string().min(8).max(180).required(),
  securityAnswer: Joi.string().min(2).max(120).required()
});

export const demoSchema = Joi.object({
  role: Joi.string().valid("customer", "agent", "admin").required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  securityAnswer: Joi.string().min(2).max(120).required(),
  password: Joi.string().min(8).max(128).required()
});

function authPayload(user) {
  const cleanUser = user.toObject ? user.toObject() : user;
  delete cleanUser.password;
  delete cleanUser.securityAnswerHash;
  delete cleanUser.resetPasswordTokenHash;
  delete cleanUser.resetPasswordExpires;
  cleanUser.requiresSecuritySetup = !cleanUser.securityRecoveryEnabled;
  return { user: cleanUser, token: signToken(user) };
}

export async function register(req, res, next) {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) {
      const error = new Error("Email is already registered");
      error.statusCode = 409;
      throw error;
    }

    const { securityQuestion, securityAnswer, ...userFields } = req.body;
    const user = new User({
      ...userFields,
      approvalStatus: userFields.role === "agent" ? "pending" : "approved"
    });
    await user.setSecurityRecovery(securityQuestion, securityAnswer);
    await user.save();
    res.status(201).json(authPayload(user));
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email }).select("+password");
    if (!user || !(await user.comparePassword(req.body.password))) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }
    if (user.disabled) {
      const error = new Error("This account is disabled. Contact an administrator.");
      error.statusCode = 403;
      throw error;
    }
    user.status = "online";
    user.lastSeenAt = new Date();
    user.lastActivityAt = new Date();
    await user.save();
    res.json(authPayload(user));
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      const error = new Error("Google login is not configured");
      error.statusCode = 503;
      throw error;
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: req.body.credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch {
      const error = new Error("Google login failed");
      error.statusCode = 401;
      throw error;
    }
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        company: "",
        avatar: payload.picture,
        googleId: payload.sub,
        role: req.body.role,
        approvalStatus: req.body.role === "agent" ? "pending" : "approved"
      });
    }
    if (user.disabled) {
      const error = new Error("This account is disabled. Contact an administrator.");
      error.statusCode = 403;
      throw error;
    }
    user.status = "online";
    user.googleId = user.googleId || payload.sub;
    user.avatar = user.avatar || payload.picture;
    user.lastSeenAt = new Date();
    user.lastActivityAt = new Date();
    await user.save();
    res.json(authPayload(user));
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: authPayload(req.user).user });
}

export async function updateProfile(req, res, next) {
  try {
    const updates = (({ name, avatar, company, customerStatus }) => ({ name, avatar, company, customerStatus }))(req.body);
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) req.user[key] = value;
    });
    await req.user.save();
    res.json({ user: authPayload(req.user).user });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user?.password) {
      const error = new Error("Password changes are unavailable for this account");
      error.statusCode = 400;
      throw error;
    }
    if (!(await user.comparePassword(req.body.currentPassword))) {
      const error = new Error("Current password is incorrect");
      error.statusCode = 401;
      throw error;
    }
    user.password = req.body.password;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    req.user.notificationPreferences = req.body.notificationPreferences;
    await req.user.save();
    res.json({ user: authPayload(req.user).user, message: "Preferences updated" });
  } catch (error) {
    next(error);
  }
}

const demoUsers = {
  customer: {
    name: "Customer Demo",
    email: "customer.demo@supanova.ai",
    company: "Nova Retail",
    role: "customer",
    approvalStatus: "approved",
    customerStatus: "vip"
  },
  agent: {
    name: "Agent Demo",
    email: "agent.demo@supanova.ai",
    company: "SupaNova AI",
    role: "agent",
    approvalStatus: "approved"
  },
  admin: {
    name: "Admin Demo",
    email: "admin.demo@supanova.ai",
    company: "SupaNova AI",
    role: "admin",
    approvalStatus: "approved"
  }
};

export async function demoLogin(req, res, next) {
  try {
    const seed = demoUsers[req.body.role];
    const password = "DemoPass123!";
    let user = await User.findOne({ email: seed.email }).select("+password");
    if (!user) {
      user = await User.create({ ...seed, password, avatar: "" });
    } else {
      Object.assign(user, seed);
    }
    if (!user.securityRecoveryEnabled) {
      await user.setSecurityRecovery("What is the demo recovery answer?", "demo");
    }
    user.disabled = false;
    user.status = "online";
    user.lastSeenAt = new Date();
    user.lastActivityAt = new Date();
    await user.save();
    res.json(authPayload(user));
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || user.disabled) {
      return res.status(404).json({
        recoveryConfigured: false,
        message: "Account recovery is not configured for this email."
      });
    }
    if (!user.securityRecoveryEnabled || !user.securityQuestion) {
      return res.status(409).json({
        recoveryConfigured: false,
        message: "Account recovery is not configured for this account. Please contact an administrator or sign in and add a security question."
      });
    }
    res.json({
      recoveryConfigured: true,
      email: user.email,
      securityQuestion: user.securityQuestion,
      message: "Answer your security question to reset your password."
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email }).select("+password +securityAnswerHash");

    if (!user || user.disabled || !user.securityRecoveryEnabled) {
      const error = new Error("Account recovery is not configured for this account");
      error.statusCode = 400;
      throw error;
    }
    if (!(await user.compareSecurityAnswer(req.body.securityAnswer))) {
      const error = new Error("Security answer is incorrect");
      error.statusCode = 401;
      throw error;
    }

    user.password = req.body.password;
    await user.save();
    res.json({ message: "Password has been reset" });
  } catch (error) {
    next(error);
  }
}

export async function securityStatus(req, res) {
  res.json({
    securityRecoveryEnabled: req.user.securityRecoveryEnabled,
    securityQuestion: req.user.securityQuestion || "",
    requiresSecuritySetup: !req.user.securityRecoveryEnabled
  });
}

export async function updateSecurity(req, res, next) {
  try {
    const previousSecurityRecoveryEnabled = req.user.securityRecoveryEnabled;
    const previousQuestionConfigured = Boolean(req.user.securityQuestion);
    await req.user.setSecurityRecovery(req.body.securityQuestion, req.body.securityAnswer);
    await req.user.save();
    await recordAuditLog(req, {
      action: "security_recovery_updated",
      resourceType: "user",
      resourceId: req.user._id,
      targetUser: req.user,
      metadata: {
        previousSecurityRecoveryEnabled,
        nextSecurityRecoveryEnabled: req.user.securityRecoveryEnabled,
        previousQuestionConfigured,
        nextQuestionConfigured: Boolean(req.user.securityQuestion)
      }
    });
    res.json({ user: authPayload(req.user).user, message: "Security recovery updated" });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    req.user.status = "offline";
    req.user.lastSeenAt = new Date();
    await req.user.save();
    req.app.get("io")?.emit("presence:update", {
      userId: String(req.user._id),
      status: "offline",
      lastSeenAt: req.user.lastSeenAt
    });
    res.json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
}
