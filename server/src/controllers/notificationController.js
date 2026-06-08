import Notification from "../models/Notification.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";

export async function listNotifications(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query, { limit: 20, maxLimit: 50 });
    const query = { user: req.user._id };
    const [notifications, total, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user._id, readAt: null })
    ]);
    res.json({ notifications, unread, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    next(error);
  }
}
