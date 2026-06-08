export function allowedOrigins() {
  return process.env.CLIENT_URL?.split(",").map((origin) => origin.trim()).filter(Boolean) || [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];
}
