import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { roles } from "../utils/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    avatar: { type: String, default: "" },
    role: { type: String, enum: roles, default: "customer" },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default() {
        return this.role === "agent" ? "pending" : "approved";
      }
    },
    disabled: { type: Boolean, default: false },
    customerStatus: { type: String, enum: ["prospect", "active", "vip", "at_risk"], default: "active" },
    status: { type: String, enum: ["online", "offline", "away"], default: "offline" },
    googleId: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    securityQuestion: { type: String, trim: true, maxlength: 180, default: "" },
    securityAnswerHash: { type: String, select: false, default: "" },
    securityRecoveryEnabled: { type: Boolean, default: false },
    notificationPreferences: {
      browser: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      emailDigest: { type: Boolean, default: false }
    },
    resetPasswordTokenHash: { type: String, select: false, default: "" },
    resetPasswordExpires: { type: Date, select: false, default: null }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ role: 1, approvalStatus: 1 });
userSchema.index({ securityRecoveryEnabled: 1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

function normalizeSecurityAnswer(answer = "") {
  return String(answer).trim().toLowerCase().replace(/\s+/g, " ");
}

userSchema.methods.setSecurityRecovery = async function setSecurityRecovery(question, answer) {
  this.securityQuestion = String(question || "").trim();
  this.securityAnswerHash = await bcrypt.hash(normalizeSecurityAnswer(answer), 12);
  this.securityRecoveryEnabled = Boolean(this.securityQuestion && this.securityAnswerHash);
};

userSchema.methods.compareSecurityAnswer = function compareSecurityAnswer(candidate) {
  if (!this.securityAnswerHash) return false;
  return bcrypt.compare(normalizeSecurityAnswer(candidate), this.securityAnswerHash);
};

export default mongoose.model("User", userSchema);
