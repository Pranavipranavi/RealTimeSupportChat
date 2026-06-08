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
    .send({ name: `${role} user`, email, password: "password123", role });
  assert.equal(response.status, 201);
  return response.body;
}

test("auth, RBAC, conversations, status, ratings, and notifications work", async () => {
  const agent = await register("agent", "agent@example.com");
  const customer = await register("customer", "customer@example.com");
  await User.findByIdAndUpdate(agent.user._id, { status: "online" });

  const created = await request(app)
    .post("/api/conversations")
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ subject: "API webhook failing", content: "Webhook returns error 500 every time." });
  assert.equal(created.status, 201);
  assert.equal(created.body.conversation.category, "technical");
  assert.equal(String(created.body.conversation.assignedAgent._id), String(agent.user._id));

  const forbiddenStatus = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${customer.token}`)
    .send({ status: "resolved" });
  assert.equal(forbiddenStatus.status, 403);

  const status = await request(app)
    .patch(`/api/conversations/${created.body.conversation._id}/status`)
    .set("Authorization", `Bearer ${agent.token}`)
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

test("forgot and reset password flow works in development", async () => {
  await register("customer", "reset@example.com");
  const forgot = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "reset@example.com" });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.body.resetToken);

  const reset = await request(app)
    .post("/api/auth/reset-password")
    .send({ token: forgot.body.resetToken, password: "newpassword123" });
  assert.equal(reset.status, 200);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "reset@example.com", password: "newpassword123" });
  assert.equal(login.status, 200);
});
