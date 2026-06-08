import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import Joi from "joi";
import User from "../models/User.js";
import { signToken } from "../utils/tokens.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid("customer", "agent").default("customer")
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
  avatar: Joi.string().uri({ scheme: ["http", "https"] }).allow("").max(500).optional()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().min(32).required(),
  password: Joi.string().min(8).max(128).required()
});

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function authPayload(user) {
  const cleanUser = user.toObject ? user.toObject() : user;
  delete cleanUser.password;
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

    const user = await User.create(req.body);
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
    user.status = "online";
    user.lastSeenAt = new Date();
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

    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        googleId: payload.sub,
        role: req.body.role
      });
    }
    user.status = "online";
    user.googleId = user.googleId || payload.sub;
    user.avatar = user.avatar || payload.picture;
    user.lastSeenAt = new Date();
    await user.save();
    res.json(authPayload(user));
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res, next) {
  try {
    const updates = (({ name, avatar }) => ({ name, avatar }))(req.body);
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) req.user[key] = value;
    });
    await req.user.save();
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email }).select("+resetPasswordTokenHash +resetPasswordExpires");
    const response = { message: "If an account exists, password reset instructions have been prepared." };
    if (!user) return res.json(response);

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = hashResetToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    if (process.env.NODE_ENV !== "production") {
      response.resetToken = token;
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const user = await User.findOne({
      resetPasswordTokenHash: hashResetToken(req.body.token),
      resetPasswordExpires: { $gt: new Date() }
    }).select("+password +resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      const error = new Error("Reset token is invalid or expired");
      error.statusCode = 400;
      throw error;
    }

    user.password = req.body.password;
    user.resetPasswordTokenHash = "";
    user.resetPasswordExpires = null;
    await user.save();
    res.json({ message: "Password has been reset" });
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
