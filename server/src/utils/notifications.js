import Notification from "../models/Notification.js";

export async function createNotification(io, payload) {
  const notification = await Notification.create(payload);
  io?.to(`user:${payload.user}`).emit("notification:new", notification);
  return notification;
}

export async function notifyUsers(io, users, payload) {
  const uniqueUsers = [...new Set(users.filter(Boolean).map(String))];
  return Promise.all(uniqueUsers.map((user) => createNotification(io, { ...payload, user })));
}
