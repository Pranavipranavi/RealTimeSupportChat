import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "socket.io";
import app from "../src/app.js";
import { configureSocket } from "../src/socket/index.js";
import User from "../src/models/User.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-supportflow-ai";
process.env.CLIENT_URL = "http://127.0.0.1:5173";

let mongo;
let server;
let io;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  server = http.createServer(app);
  io = new Server(server);
  app.set("io", io);
  configureSocket(io);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  io.close();
  server.close();
});

async function register(role, email) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: `${role} user`,
      email,
      password: "password123",
      role,
      securityQuestion: "What is your test recovery phrase?",
      securityAnswer: "blue comet"
    });
  assert.equal(response.status, 201);
  return response.body;
}

async function createSuperAdmin(email = "suhas.owner@example.com") {
  const user = new User({
    name: "Suhas",
    email,
    password: "password123",
    role: "super_admin",
    approvalStatus: "approved"
  });
  await user.setSecurityRecovery("What is your test recovery phrase?", "blue comet");
  await user.save();
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "super_admin");
  return login.body;
}

test("auth, RBAC, conversations, status, ratings, and notifications work", async () => {
  const agent = await register("agent", "agent@example.com");
  const customer = await register("customer", "customer@example.com");
  const superAdmin = await createSuperAdmin("status.owner@example.com");
  await User.findByIdAndUpdate(agent.user._id, { status: "online", approvalStatus: "approved" });

  const created = await request(app)
    .post("/api/conversations")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ subject: "API webhook failing", content: "Urgent webhook returns error 500 every time." });
  assert.equal(created.status, 201);
  assert.equal(created.body.conversation.category, "technical");
  assert.equal(created.body.conversation.priority, "high");
  assert.equal(created.body.conversation.status, "assigned");
  assert.ok(created.body.conversation.suggestedReplies.length);
  assert.equal(String(created.body.conversation.assignedAgent._id), String(agent.user._id));

  const forbiddenStatus = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ status: "resolved" });
  assert.equal(forbiddenStatus.status, 403);

  const agentStatus = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${agent.token}`)
    .send({ status: "resolved" });
  assert.equal(agentStatus.status, 403);

  const status = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ status: "resolved" });
  assert.equal(status.status, 200);
  assert.equal(status.body.conversation.status, "resolved");

  const rating = await request(app)
    .post(`/api/ratings/${created.body.conversation._id}`)
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ rating: 5, feedback: "Fast support." });
  assert.equal(rating.status, 201);

  const notifications = await request(app)
    .get("/api/notifications")
    .set("Authorization", `Bearer ${customer.token}`);
  assert.equal(notifications.status, 200);
  assert.ok(Array.isArray(notifications.body.notifications));
});

test("forgot and reset password flow works with security question", async () => {
  await register("customer", "reset@example.com");
  const forgot = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "reset@example.com" });
  assert.equal(forgot.status, 200);
  assert.equal(forgot.body.recoveryConfigured, true);
  assert.equal(forgot.body.securityQuestion, "What is your test recovery phrase?");

  const invalid = await request(app)
    .post("/api/auth/reset-password")
    .send({ email: "reset@example.com", securityAnswer: "wrong", password: "newpassword123" });
  assert.equal(invalid.status, 401);

  const reset = await request(app)
    .post("/api/auth/reset-password")
    .send({ email: "reset@example.com", securityAnswer: "blue comet", password: "newpassword123" });
  assert.equal(reset.status, 200);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "reset@example.com", password: "newpassword123" });
  assert.equal(login.status, 200);
});

test("agent approval and security setup controls work", async () => {
  const superAdmin = await createSuperAdmin("approval.owner@example.com");
  const pendingAgent = await register("agent", "pending-agent@example.com");
  assert.equal(pendingAgent.user.approvalStatus, "pending");

  const pendingList = await request(app)
    .get("/api/conversations")
    .set("Authorization", `Bearer ${pendingAgent.token}`);
  assert.equal(pendingList.status, 200);
  assert.equal(pendingList.body.conversations.length, 0);

  const approved = await request(app)
    .patch(`/api/admin/users/${pendingAgent.user._id}/approval`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ approvalStatus: "approved" });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.user.approvalStatus, "approved");

  const disabled = await request(app)
    .patch(`/api/admin/users/${pendingAgent.user._id}/disabled`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ disabled: true });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.user.disabled, true);
});

test("admin assignment, workflow validation, preferences, previews, and analytics work", async () => {
  const admin = await request(app).post("/api/auth/demo").send({ role: "admin" });
  const superAdmin = await createSuperAdmin("workflow.owner@example.com");
  const customer = await register("customer", "assignment-customer@example.com");
  const agent = await register("agent", "assignment-agent@example.com");
  await User.findByIdAndUpdate(agent.user._id, { approvalStatus: "approved", status: "online" });

  const created = await request(app)
    .post("/api/conversations")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ subject: "Manual assignment needed", content: "Please assign this ticket deliberately.", category: "general" });
  assert.equal(created.status, 201);

  const adminAssignmentDenied = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/assignment`)
    .set("Authorization", `Bearer ${admin.body.token}`)
    .send({ agentId: agent.user._id });
  assert.equal(adminAssignmentDenied.status, 403);

  const assigned = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/assignment`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ agentId: agent.user._id });
  assert.equal(assigned.status, 200);
  assert.equal(String(assigned.body.conversation.assignedAgent._id), String(agent.user._id));

  const adminWorkflowDenied = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${admin.body.token}`)
    .send({ status: "open" });
  assert.equal(adminWorkflowDenied.status, 403);

  const invalidTransition = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ status: "open" });
  assert.equal(invalidTransition.status, 200);

  const assignedAgain = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/assignment`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ agentId: agent.user._id });
  assert.equal(assignedAgain.status, 200);

  const progressed = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ status: "in_progress" });
  assert.equal(progressed.status, 200);
  assert.equal(progressed.body.conversation.status, "in_progress");

  const message = await request(app)
    .post(`/api/messages/${created.body.conversation._id}`)
    .set("Authorization", `Bearer ${agent.token}`)
    .field("content", "Agent reply preview text");
  assert.equal(message.status, 201);

  const listed = await request(app)
    .get("/api/conversations?q=Manual%20assignment&limit=5")
    .set("Authorization", `Bearer ${admin.body.token}`);
  assert.equal(listed.status, 200);
  assert.equal(typeof listed.body.conversations[0].unreadCount, "number");
  assert.equal(listed.body.conversations[0].lastMessagePreview, "Agent reply preview text");

  const preferences = await request(app)
    .patch("/api/auth/preferences")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ notificationPreferences: { browser: true, sound: false, emailDigest: true } });
  assert.equal(preferences.status, 200);
  assert.equal(preferences.body.user.notificationPreferences.sound, false);

  const analytics = await request(app)
    .get("/api/admin/analytics")
    .set("Authorization", `Bearer ${admin.body.token}`);
  assert.equal(analytics.status, 200);
  assert.equal(typeof analytics.body.totals.totalCustomers, "number");
  assert.equal(typeof analytics.body.totals.totalAgents, "number");
  assert.equal(typeof analytics.body.totals.onlineAgents, "number");
  assert.equal(typeof analytics.body.totals.priorityUrgent, "number");
});

test("demo login creates recruiter-ready role sessions", async () => {
  for (const role of ["customer", "agent", "admin"]) {
    const response = await request(app)
      .post("/api/auth/demo")
      .send({ role });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, role);
    assert.ok(response.body.token);
    assert.ok(response.body.user.company);
  }
});

test("super admin boundary protects privileged admin operations", async () => {
  const customer = await register("customer", "rbac-customer@example.com");
  const agent = await register("agent", "rbac-agent@example.com");
  await User.findByIdAndUpdate(agent.user._id, { approvalStatus: "approved" });
  const admin = await request(app).post("/api/auth/demo").send({ role: "admin" });
  const superAdmin = await createSuperAdmin();

  const customerAdminRoute = await request(app)
    .get("/api/admin/users")
    .set("Authorization", `Bearer ${customer.token}`);
  assert.equal(customerAdminRoute.status, 403);

  const agentAdminRoute = await request(app)
    .get("/api/admin/users")
    .set("Authorization", `Bearer ${agent.token}`);
  assert.equal(agentAdminRoute.status, 403);

  const adminRoleChange = await request(app)
    .patch(`/api/admin/users/${customer.user._id}/role`)
    .set("Authorization", `Bearer ${admin.body.token}`)
    .send({ role: "admin" });
  assert.equal(adminRoleChange.status, 403);

  const adminSecurityOverview = await request(app)
    .get("/api/admin/security")
    .set("Authorization", `Bearer ${admin.body.token}`);
  assert.equal(adminSecurityOverview.status, 403);

  const adminApprovalChange = await request(app)
    .patch(`/api/admin/users/${agent.user._id}/approval`)
    .set("Authorization", `Bearer ${admin.body.token}`)
    .send({ approvalStatus: "rejected" });
  assert.equal(adminApprovalChange.status, 403);

  const adminDisableAgent = await request(app)
    .patch(`/api/admin/users/${agent.user._id}/disabled`)
    .set("Authorization", `Bearer ${admin.body.token}`)
    .send({ disabled: true });
  assert.equal(adminDisableAgent.status, 403);

  const adminDeleteAgent = await request(app)
    .delete(`/api/admin/users/${agent.user._id}`)
    .set("Authorization", `Bearer ${admin.body.token}`);
  assert.equal(adminDeleteAgent.status, 403);

  const adminDeleteCustomer = await request(app)
    .delete(`/api/admin/users/${customer.user._id}`)
    .set("Authorization", `Bearer ${admin.body.token}`);
  assert.equal(adminDeleteCustomer.status, 403);

  const promoted = await request(app)
    .patch(`/api/admin/users/${customer.user._id}/role`)
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ role: "admin" });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.user.role, "admin");

  const securityOverview = await request(app)
    .get("/api/admin/security")
    .set("Authorization", `Bearer ${superAdmin.token}`);
  assert.equal(securityOverview.status, 200);
  assert.equal(typeof securityOverview.body.recoveryEnabled, "number");

  const systemConfig = await request(app)
    .get("/api/admin/system-config")
    .set("Authorization", `Bearer ${superAdmin.token}`);
  assert.equal(systemConfig.status, 200);
  assert.equal(typeof systemConfig.body.mongodbConfigured, "boolean");

  const deletedAgent = await request(app)
    .delete(`/api/admin/users/${agent.user._id}`)
    .set("Authorization", `Bearer ${superAdmin.token}`);
  assert.equal(deletedAgent.status, 200);

  const auditLogs = await request(app)
    .get("/api/admin/audit-logs")
    .set("Authorization", `Bearer ${superAdmin.token}`);
  assert.equal(auditLogs.status, 200);
  assert.ok(auditLogs.body.auditLogs.some((log) => log.action === "user_role_changed" || log.action === "admin_created"));

  const transferred = await request(app)
    .patch(`/api/admin/users/${customer.user._id}/transfer-ownership`)
    .set("Authorization", `Bearer ${superAdmin.token}`);
  assert.equal(transferred.status, 200);
  assert.equal(transferred.body.user.role, "super_admin");
  assert.equal(transferred.body.previousOwner.role, "admin");
});
