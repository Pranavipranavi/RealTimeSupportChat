export const PRODUCT_NAME = "SupaNova AI";

export const adminRoles = ["admin", "super_admin"];

export function isAdminRole(role) {
  return adminRoles.includes(role);
}

export function isSuperAdminRole(role) {
  return role === "super_admin";
}

export function roleLabel(role) {
  const labels = {
    super_admin: "Super Admin",
    admin: "Admin",
    agent: "Support Agent",
    customer: "Customer"
  };
  return labels[role] || String(role || "User").replaceAll("_", " ");
}

export const ticketStatuses = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_customer", label: "Waiting For Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

export const ticketPriorities = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

export const ticketTransitions = {
  open: ["assigned", "in_progress", "closed"],
  assigned: ["open", "in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: ["open"]
};

export function statusLabel(value) {
  return ticketStatuses.find((status) => status.value === value)?.label || value;
}

export function statusOptionsFor(currentStatus) {
  const values = [currentStatus, ...(ticketTransitions[currentStatus] || [])].filter(Boolean);
  const uniqueValues = [...new Set(values)];
  return uniqueValues.map((value) => ticketStatuses.find((status) => status.value === value) || { value, label: statusLabel(value) });
}
