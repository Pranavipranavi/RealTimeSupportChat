import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Rating from "../models/Rating.js";
import User from "../models/User.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function analytics(req, res, next) {
  try {
    const [totalUsers, activeUsers, messagesToday, totalConversations, statusCounts, ratings, agents] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "online" }),
      Message.countDocuments({ timestamp: { $gte: startOfToday() } }),
      Conversation.countDocuments(),
      Conversation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Rating.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]),
      User.find({ role: { $in: ["agent", "admin"] } }).select("name email avatar role status")
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
    const responseMap = new Map(responseTimes.map((item) => [String(item._id), item]));
    const assignedMap = new Map(assignedCounts.map((item) => [String(item._id), item]));

    res.json({
      totals: {
        totalUsers,
        activeUsers,
        messagesToday,
        totalConversations,
        openTickets: byStatus.open || 0,
        pendingTickets: byStatus.pending || 0,
        resolvedTickets: byStatus.resolved || 0,
        closedTickets: byStatus.closed || 0,
        customerSatisfaction: Number((ratings[0]?.avg || 0).toFixed(2)),
        averageResponseTimeMs: Math.round(responseTimes.reduce((sum, item) => sum + item.avgMs, 0) / (responseTimes.length || 1))
      },
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
    const { role, q } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 25, maxLimit: 100 });
    const query = {};
    if (role) query.role = role;
    const safeQuery = escapeRegex(q || "");
    if (q) query.$or = [
      { name: new RegExp(safeQuery, "i") },
      { email: new RegExp(safeQuery, "i") }
    ];
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query)
    ]);
    res.json({ users, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    if (String(req.user._id) === String(req.params.id) && req.body.role !== "admin") {
      const error = new Error("You cannot remove your own admin access");
      error.statusCode = 400;
      throw error;
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
