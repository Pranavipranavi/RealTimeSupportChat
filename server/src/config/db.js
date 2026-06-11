import "./env.js";
import mongoose from "mongoose";

function redactMongoUri(value = "") {
  return value.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/, "$1<redacted>$3");
}

function parseMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    return {
      protocol: parsed.protocol,
      username: parsed.username ? decodeURIComponent(parsed.username) : "",
      passwordPresent: Boolean(parsed.password),
      host: parsed.host,
      databaseName: parsed.pathname.replace(/^\//, "") || "(not set - MongoDB driver default applies)",
      queryParams: Object.fromEntries(parsed.searchParams.entries())
    };
  } catch (error) {
    return { parseError: error.message };
  }
}

function classifyMongoError(error) {
  const message = `${error?.message || ""} ${error?.reason?.message || ""}`;
  const serverErrors = error?.reason
    ? Array.from(error.reason.servers.values()).map((server) => server.error?.message || "").join(" ")
    : "";
  const combined = `${message} ${serverErrors}`;

  if (/Invalid scheme|Invalid connection string|URI malformed|querySrv/i.test(combined)) return "Invalid URI or DNS SRV record";
  if (/bad auth|Authentication failed|auth failed|not authorized/i.test(combined)) return "Invalid credentials or authSource";
  if (/IP.*whitelist|not authorized|connection.*closed|ECONNREFUSED|ETIMEDOUT|ENETUNREACH/i.test(combined)) return "Atlas IP whitelist, firewall, or network reachability";
  if (/ENOTFOUND|ETIMEOUT.*querySrv|ESERVFAIL|ENODATA|EREFUSED|DNS/i.test(combined)) return "DNS issue";
  if (/ReplicaSetNoPrimary|ServerSelectionError|Could not connect to any servers/i.test(combined)) return "Atlas cluster unavailable, paused, IP whitelist blocked, or outbound network blocked";
  return "Unknown MongoDB connection failure";
}

function logMongoServerDetails(error) {
  if (!error?.reason?.servers) return;
  const servers = Array.from(error.reason.servers.entries()).map(([address, server]) => ({
    address,
    type: server.type,
    error: server.error?.message
  }));
  console.error("[mongodb] Server selection details:", JSON.stringify(servers, null, 2));
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  const timeout = Number(process.env.MONGODB_TIMEOUT_MS || 10000);
  const parsed = parseMongoUri(uri);
  console.info("[mongodb] Connection configuration:", JSON.stringify({
    uri: redactMongoUri(uri),
    ...parsed,
    serverSelectionTimeoutMS: timeout
  }, null, 2));
  if (parsed.databaseName?.startsWith("(not set")) {
    console.warn("[mongodb] No database name is present in MONGODB_URI. Mongoose will use the driver default database, usually 'test'.");
  }

  mongoose.set("strictQuery", true);
  mongoose.connection.on("disconnected", () => console.warn("[mongodb] Disconnected"));
  mongoose.connection.on("reconnected", () => console.info("[mongodb] Reconnected"));
  mongoose.connection.on("error", (error) => console.error("[mongodb] Connection event error:", error.message));

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeout
    });
    console.log(`[mongodb] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.error(`[mongodb] Connection failed: ${error.name}: ${error.message}`);
    console.error(`[mongodb] Likely category: ${classifyMongoError(error)}`);
    logMongoServerDetails(error);
    throw error;
  }
}
