import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

export async function assignAgent() {
  const agents = await User.find({ role: { $in: ["agent", "admin"] } }).select("_id status name");
  if (!agents.length) return null;

  const workloads = await Conversation.aggregate([
    { $match: { status: { $in: ["open", "pending"] }, assignedAgent: { $ne: null } } },
    { $group: { _id: "$assignedAgent", count: { $sum: 1 } } }
  ]);
  const workloadMap = new Map(workloads.map((item) => [String(item._id), item.count]));

  return agents
    .sort((a, b) => {
      const onlineDelta = Number(b.status === "online") - Number(a.status === "online");
      if (onlineDelta) return onlineDelta;
      return (workloadMap.get(String(a._id)) || 0) - (workloadMap.get(String(b._id)) || 0);
    })[0]?._id || null;
}
