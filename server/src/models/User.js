import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["customer", "agent", "admin"], default: "customer" },
    status: { type: String, enum: ["online", "offline", "away"], default: "offline" },
    googleId: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    resetPasswordTokenHash: { type: String, select: false, default: "" },
    resetPasswordExpires: { type: Date, select: false, default: null }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
