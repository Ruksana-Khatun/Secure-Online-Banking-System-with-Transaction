export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5000"

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function request(path, { method = "GET", token, body, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    const message = data?.error || data?.message || "Request failed";
    throw new ApiError(message, { status: res.status, data });
  }

  return data;
}

