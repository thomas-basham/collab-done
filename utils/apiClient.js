import { fetchAuthSession } from "aws-amplify/auth";
import "./amplifyConfig";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

export async function getIdToken() {
  try {
    const session = await fetchAuthSession();
    return session?.tokens?.idToken?.toString() || null;
  } catch (_err) {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const token = await getIdToken();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

export function getWsUrl(userId) {
  if (!WS_URL) {
    return null;
  }
  const separator = WS_URL.includes("?") ? "&" : "?";
  return `${WS_URL}${separator}userId=${encodeURIComponent(userId || "")}`;
}
