import "../config/env.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import { recordSystemAuditLog } from "../utils/audit.js";

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error("Usage: npm run create-admin -- \"Admin Name\" admin@example.com strongpassword");
  process.exit(1);
}

await connectDB();

const existing = await User.findOne({ email });
if (existing) {
  const previousRole = existing.role;
  existing.name = name;
  existing.role = "admin";
  existing.approvalStatus = "approved";
  if (password) existing.password = password;
  await existing.save();
  await recordSystemAuditLog({
    action: "admin_updated",
    resourceType: "user",
    resourceId: existing._id,
    targetUser: existing,
    metadata: { previousRole, nextRole: "admin" }
  });
  console.log(`Updated admin: ${email}`);
} else {
  const user = await User.create({ name, email, password, role: "admin", approvalStatus: "approved" });
  await recordSystemAuditLog({
    action: "admin_created",
    resourceType: "user",
    resourceId: user._id,
    targetUser: user,
    metadata: { source: "create-admin script" }
  });
  console.log(`Created admin: ${email}`);
}

await mongoose.disconnect();
