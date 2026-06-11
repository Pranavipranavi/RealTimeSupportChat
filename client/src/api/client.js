import { useAuthStore } from "../store/authStore.js";

function localAwareApiUrl() {
  const configured = import.meta.env.VITE_API_URL || "";
  if (!configured && typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:5000`;
  if (!configured) return "http://localhost:5000";
  if (typeof window === "undefined") return configured;

  try {
    const url = new URL(configured);
    const host = window.location.hostname;
    if ((host === "127.0.0.1" || host === "::1") && url.hostname === "localhost") {
      url.hostname = host;
      return url.toString().replace(/\/$/, "");
    }
    if (host === "localhost" && (url.hostname === "127.0.0.1" || url.hostname === "::1")) {
      url.hostname = "localhost";
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return configured;
  }
  return configured;
}

export const API_URL = localAwareApiUrl();

async function request(path, options = {}) {
  const token = useAuthStore.getState().token;
  const isForm = options.body instanceof FormData;
  const url = `${API_URL}${path}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch (error) {
    console.error("[api] Network request failed", {
      url,
      method: options.method || "GET",
      message: error.message,
      apiUrl: API_URL
    });
    throw new Error(`Backend unreachable at ${API_URL}. Verify the API server is running and VITE_API_URL is correct.`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || `Request failed with status ${response.status}`;
    console.error("[api] Backend request failed", {
      url,
      method: options.method || "GET",
      status: response.status,
      message,
      details: data.details
    });
    throw new Error(message);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" })
};

export function assetUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}
