import AuditLog from "../models/AuditLog.js";

function requestIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req?.ip || req?.socket?.remoteAddress || "";
}

export async function recordAuditLog(req, payload) {
  const actor = req?.user || null;
  const target = payload.targetUser || null;
  try {
    await AuditLog.create({
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: String(payload.resourceId || ""),
      actor: actor?._id || null,
      actorEmail: actor?.email || "",
      actorRole: actor?.role || "",
      targetUser: target?._id || payload.targetUserId || null,
      targetEmail: target?.email || payload.targetEmail || "",
      targetRole: target?.role || payload.targetRole || "",
      metadata: payload.metadata || {},
      ip: requestIp(req),
      userAgent: req?.headers?.["user-agent"] || ""
    });
  } catch (error) {
    console.error("[audit] Failed to write audit log", {
      action: payload.action,
      resourceType: payload.resourceType,
      error: error.message
    });
  }
}

export async function recordSystemAuditLog(payload) {
  try {
    await AuditLog.create({
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: String(payload.resourceId || ""),
      actor: payload.actor?._id || null,
      actorEmail: payload.actor?.email || "",
      actorRole: payload.actor?.role || "system",
      targetUser: payload.targetUser?._id || null,
      targetEmail: payload.targetUser?.email || payload.targetEmail || "",
      targetRole: payload.targetUser?.role || payload.targetRole || "",
      metadata: payload.metadata || {},
      ip: "system",
      userAgent: "system"
    });
  } catch (error) {
    console.error("[audit] Failed to write system audit log", {
      action: payload.action,
      resourceType: payload.resourceType,
      error: error.message
    });
  }
}
