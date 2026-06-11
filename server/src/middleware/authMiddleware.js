import User from "../models/User.js";
import { verifyToken } from "../utils/tokens.js";
import { isAdminRole } from "../utils/roles.js";

export async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.id);
    if (!user) {
      const error = new Error("User no longer exists");
      error.statusCode = 401;
      throw error;
    }
    if (user.disabled) {
      const error = new Error("This account is disabled");
      error.statusCode = 403;
      throw error;
    }
    req.user = user;
    next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
}

export function allowRoles(...roles) {
  return (req, _res, next) => {
    const allowed = roles.some((role) => {
      if (role === "admin") return isAdminRole(req.user);
      return req.user.role === role;
    });
    if (!allowed) {
      const error = new Error("You do not have permission to perform this action");
      error.statusCode = 403;
      return next(error);
    }
    if (req.user.role === "agent" && req.user.approvalStatus !== "approved") {
      const error = new Error("Your support agent account is pending admin approval");
      error.statusCode = 403;
      return next(error);
    }
    return next();
  };
}
