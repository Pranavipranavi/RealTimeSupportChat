export const roles = ["super_admin", "admin", "agent", "customer"];
export const adminRoles = ["super_admin", "admin"];

export function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

export function isAdminRole(user) {
  return adminRoles.includes(user?.role);
}

export function ensureSuperAdmin(user, message = "Super Admin access is required") {
  if (isSuperAdmin(user)) return;
  const error = new Error(message);
  error.statusCode = 403;
  throw error;
}

export function roleLabel(role) {
  return String(role || "").replaceAll("_", " ");
}
