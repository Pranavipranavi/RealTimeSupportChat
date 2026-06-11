import "./config/env.js";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { allowedOrigins } from "./config/cors.js";
import { connectDB } from "./config/db.js";
import { configureSocket } from "./socket/index.js";
import { ensureConfiguredSuperAdmin } from "./utils/bootstrapSuperAdmin.js";

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins(),
    credentials: true
  }
});

app.set("io", io);
configureSocket(io);

connectDB()
  .then(async () => {
    await ensureConfiguredSuperAdmin();
    server.listen(port, () => {
      console.log(`SupaNova AI API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });
