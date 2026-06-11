import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Rating from "../models/Rating.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { recordAuditLog } from "../utils/audit.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { ensureSuperAdmin, isSuperAdmin, roles } from "../utils/roles.js";

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function stripRestrictedUserFields(user, requester) {
  const clean = user.toObject ? user.toObject() : { ...user };
  if (!isSuperAdmin(requester)) {
    delete clean.securityQuestion;
    delete clean.securityRecoveryEnabled;
  }
  return clean;
}

async function ensureNotLastSuperAdmin(userId) {
  const target = await User.findById(userId);
  if (!target) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (target.role === "super_admin") {
    const superAdminCount = await User.countDocuments({ role: "super_admin", disabled: false });
    if (superAdminCount <= 1) {
      const error = new Error("At least one active Super Admin is required");
      error.statusCode = 400;
      throw error;
    }
  }
  return target;
}

export async function analytics(req, res, next) {
  try {
    const [totalUsers, totalCustomers, totalAgents, activeUsers, onlineAgents, messagesToday, totalConversations, statusCounts, priorityCounts, ratings, agents, securityEnabled, securityMissing, pendingAgents, rejectedAgents] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "agent" }),
      User.countDocuments({ status: "online" }),
      User.countDocuments({ role: "agent", status: "online", approvalStatus: "approved", disabled: false }),
      Message.countDocuments({ timestamp: { $gte: startOfToday() } }),
      Conversation.countDocuments(),
      Conversation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Conversation.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Rating.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]),
      User.find({ role: "agent" }).select("name email avatar role status approvalStatus"),
      User.countDocuments({ securityRecoveryEnabled: true }),
      User.countDocuments({ securityRecoveryEnabled: { $ne: true } }),
      User.countDocuments({ role: "agent", approvalStatus: "pending" }),
      User.countDocuments({ role: "agent", approvalStatus: "rejected" })
    ]);

    const responseTimes = await Conversation.aggregate([
      { $match: { firstResponseAt: { $ne: null } } },
      { $project: { diff: { $subtract: ["$firstResponseAt", "$createdAt"] }, assignedAgent: 1 } },
      { $group: { _id: "$assignedAgent", avgMs: { $avg: "$diff" }, count: { $sum: 1 } } }
    ]);
    const assignedCounts = await Conversation.aggregate([
      { $match: { assignedAgent: { $ne: null } } },
      { $group: { _id: "$assignedAgent", total: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } }, resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } } } }
    ]);

    const byStatus = Object.fromEntries(statusCounts.map((item) => [item._id, item.count]));
    const byPriority = Object.fromEntries(priorityCounts.map((item) => [item._id, item.count]));
    const responseMap = new Map(responseTimes.map((item) => [String(item._id), item]));
    const assignedMap = new Map(assignedCounts.map((item) => [String(item._id), item]));

    const totals = {
        totalUsers,
        totalCustomers,
        totalAgents,
        activeUsers,
        onlineAgents,
        messagesToday,
        totalConversations,
        openTickets: byStatus.open || 0,
        assignedTickets: byStatus.assigned || 0,
        inProgressTickets: byStatus.in_progress || 0,
        waitingTickets: byStatus.waiting_for_customer || 0,
        resolvedTickets: byStatus.resolved || 0,
        closedTickets: byStatus.closed || 0,
        resolutionRate: Number((((byStatus.resolved || 0) + (byStatus.closed || 0)) / Math.max(totalConversations, 1) * 100).toFixed(1)),
        customerSatisfaction: Number((ratings[0]?.avg || 0).toFixed(2)),
        averageResponseTimeMs: Math.round(responseTimes.reduce((sum, item) => sum + item.avgMs, 0) / (responseTimes.length || 1)),
        pendingAgents,
        rejectedAgents,
        priorityLow: byPriority.low || 0,
        priorityNormal: byPriority.normal || 0,
        priorityHigh: byPriority.high || 0,
        priorityUrgent: byPriority.urgent || 0
      };
    if (isSuperAdmin(req.user)) {
      totals.securityRecoveryEnabled = securityEnabled;
      totals.securityRecoveryMissing = securityMissing;
    }

    res.json({
      totals,
      agentPerformance: agents.map((agent) => {
        const response = responseMap.get(String(agent._id));
        const assigned = assignedMap.get(String(agent._id));
        return {
          agent,
          conversations: assigned?.total || 0,
          open: assigned?.open || 0,
          resolved: assigned?.resolved || 0,
          averageResponseTimeMs: Math.round(response?.avgMs || 0)
        };
      })
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { role, q, approvalStatus } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 25, maxLimit: 100 });
    const query = {};
    if (role) query.role = role;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (!isSuperAdmin(req.user)) {
      if (role === "admin" || role === "super_admin") {
        return res.json({ users: [], pagination: paginationMeta(0, page, limit) });
      }
      query.role = query.role || { $in: ["customer", "agent"] };
    }
    const safeQuery = escapeRegex(q || "");
    if (q) query.$or = [
      { name: new RegExp(safeQuery, "i") },
      { email: new RegExp(safeQuery, "i") }
    ];
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query)
    ]);
    res.json({
      users: users.map((user) => stripRestrictedUserFields(user, req.user)),
      pagination: paginationMeta(total, page, limit)
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can change user roles");
    if (!roles.includes(req.body.role)) {
      const error = new Error("Invalid role");
      error.statusCode = 400;
      throw error;
    }
    const existing = await User.findById(req.params.id);
    if (!existing) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    if (existing.role === "super_admin" && req.body.role !== "super_admin") {
      await ensureNotLastSuperAdmin(req.params.id);
    }
    if (String(req.user._id) === String(req.params.id) && req.body.role !== "super_admin") {
      const error = new Error("Transfer ownership before demoting your own Super Admin account");
      error.statusCode = 400;
      throw error;
    }
    const previousRole = existing.role;
    const updates = { role: req.body.role };
    if (req.body.role === "agent") updates.approvalStatus = "pending";
    else updates.approvalStatus = "approved";
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    await recordAuditLog(req, {
      action: req.body.role === "admin" && previousRole !== "admin" ? "admin_created" : "user_role_changed",
      resourceType: "user",
      resourceId: user._id,
      targetUser: user,
      metadata: { previousRole, nextRole: user.role }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateUserApproval(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can approve or reject agents");
    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    if (user.role !== "agent") {
      const error = new Error("Only support agents require approval");
      error.statusCode = 400;
      throw error;
    }
    const previousApprovalStatus = user.approvalStatus;
    user.approvalStatus = req.body.approvalStatus;
    await user.save();
    await recordAuditLog(req, {
      action: "agent_approval_changed",
      resourceType: "user",
      resourceId: user._id,
      targetUser: user,
      metadata: { previousApprovalStatus, nextApprovalStatus: user.approvalStatus }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateUserDisabled(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can enable or disable accounts");
    if (String(req.user._id) === String(req.params.id) && req.body.disabled) {
      const error = new Error("You cannot disable your own account");
      error.statusCode = 400;
      throw error;
    }
    const existing = req.body.disabled ? await ensureNotLastSuperAdmin(req.params.id) : await User.findById(req.params.id);
    if (!existing) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    const updates = { disabled: req.body.disabled };
    if (req.body.disabled) updates.status = "offline";
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    await recordAuditLog(req, {
      action: req.body.disabled ? "user_disabled" : "user_enabled",
      resourceType: "user",
      resourceId: user._id,
      targetUser: user,
      metadata: { role: user.role }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can delete accounts");
    if (String(req.user._id) === String(req.params.id)) {
      const error = new Error("You cannot delete your own account");
      error.statusCode = 400;
      throw error;
    }
    const existing = await ensureNotLastSuperAdmin(req.params.id);
    const user = await User.findByIdAndDelete(req.params.id);
    await recordAuditLog(req, {
      action: ["admin", "super_admin"].includes(existing.role) ? "admin_deleted" : "user_deleted",
      resourceType: "user",
      resourceId: existing._id,
      targetUser: existing,
      metadata: { deletedRole: existing.role, deletedEmail: existing.email }
    });
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
}

export async function transferOwnership(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can transfer ownership");
    if (String(req.user._id) === String(req.params.id)) {
      const error = new Error("Ownership is already assigned to this Super Admin");
      error.statusCode = 400;
      throw error;
    }
    const target = await User.findById(req.params.id);
    if (!target) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    if (target.disabled) {
      const error = new Error("Ownership cannot be transferred to a disabled account");
      error.statusCode = 400;
      throw error;
    }
    if (target.role !== "admin") {
      const error = new Error("Promote the user to Admin before transferring ownership");
      error.statusCode = 400;
      throw error;
    }
    target.role = "super_admin";
    target.approvalStatus = "approved";
    await target.save();
    await recordAuditLog(req, {
      action: "ownership_transferred",
      resourceType: "user",
      resourceId: target._id,
      targetUser: target,
      metadata: { previousOwnerId: String(req.user._id), newOwnerId: String(target._id) }
    });
    req.user.role = "admin";
    req.user.approvalStatus = "approved";
    await req.user.save();
    res.json({ user: target, previousOwner: req.user });
  } catch (error) {
    next(error);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can view audit logs");
    const { page, limit, skip } = getPagination(req.query, { limit: 25, maxLimit: 100 });
    const [logs, total] = await Promise.all([
      AuditLog.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments()
    ]);
    res.json({ auditLogs: logs, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
}

export async function securityOverview(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can view security settings");
    const [superAdmins, admins, recoveryEnabled, recoveryMissing, disabledUsers, recentAuditEvents] = await Promise.all([
      User.countDocuments({ role: "super_admin", disabled: false }),
      User.countDocuments({ role: "admin", disabled: false }),
      User.countDocuments({ securityRecoveryEnabled: true }),
      User.countDocuments({ securityRecoveryEnabled: { $ne: true } }),
      User.countDocuments({ disabled: true }),
      AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);
    res.json({
      superAdmins,
      admins,
      recoveryEnabled,
      recoveryMissing,
      disabledUsers,
      recentAuditEvents
    });
  } catch (error) {
    next(error);
  }
}

export async function systemConfig(req, res, next) {
  try {
    ensureSuperAdmin(req.user, "Only Super Admins can access system configuration");
    res.json({
      nodeEnv: process.env.NODE_ENV || "development",
      uploadDir: process.env.UPLOAD_DIR || "uploads",
      maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),
      googleLoginConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
      mongodbConfigured: Boolean(process.env.MONGODB_URI),
      clientUrlConfigured: Boolean(process.env.CLIENT_URL),
      superAdminBootstrapConfigured: Boolean(process.env.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_NAME)
    });
  } catch (error) {
    next(error);
  }
}
