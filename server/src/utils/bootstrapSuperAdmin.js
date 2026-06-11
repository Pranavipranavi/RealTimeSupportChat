import User from "../models/User.js";
import { recordSystemAuditLog } from "./audit.js";

const DEFAULT_OWNER_EMAIL = "sunnysuhas108@gmail.com";

function ownerNamePattern() {
  const configuredName = process.env.SUPER_ADMIN_NAME || "Suhas";
  return new RegExp(`^${configuredName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

export async function ensureConfiguredSuperAdmin() {
  const explicitEmailConfigured = Boolean(process.env.SUPER_ADMIN_EMAIL);
  const configuredEmail = String(process.env.SUPER_ADMIN_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();

  let owner = await User.findOne({ email: configuredEmail });
  if (!owner && !explicitEmailConfigured) {
    owner = await User.findOne({ name: ownerNamePattern() });
  }
  if (!owner) {
    const existingSuperAdmin = await User.exists({ role: "super_admin", disabled: false });
    if (!existingSuperAdmin) {
      console.warn(`[security] No Super Admin account found. Create ${configuredEmail} or set SUPER_ADMIN_EMAIL.`);
    }
    return null;
  }

  if (owner.role === "super_admin") return owner;
  const previousRole = owner.role;
  owner.role = "super_admin";
  owner.approvalStatus = "approved";
  owner.disabled = false;
  await owner.save();
  await recordSystemAuditLog({
    action: "owner_bootstrapped",
    resourceType: "user",
    resourceId: owner._id,
    targetUser: owner,
    metadata: { previousRole, bootstrap: explicitEmailConfigured ? "SUPER_ADMIN_EMAIL" : "default_owner_email" }
  });
  console.info(`[security] Promoted ${owner.email} to Super Admin owner.`);
  return owner;
}
