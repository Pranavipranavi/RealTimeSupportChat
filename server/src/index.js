import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { allowedOrigins } from "./config/cors.js";
import { connectDB } from "./config/db.js";
import { configureSocket } from "./socket/index.js";

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
  .then(() => {
    server.listen(port, () => {
      console.log(`SupportFlow AI API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });
