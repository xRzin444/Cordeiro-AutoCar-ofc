import { getToken, removeToken, saveToken, saveUser, clearUser } from "../auth/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
const API = `${BASE}/api`;

export async function login(pin: string) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = await r.json();
  if (!r.ok) {
    const detail = data.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? "Informe um PIN válido de 4 dígitos."
        : "Não foi possível entrar.";
    throw new Error(message);
  }
  await saveToken(data.access_token);
  await saveUser(data.user);
  return data;
}

export async function logout() {
  await removeToken();
  await clearUser();
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const r = await fetch(`${API}${path}`, { ...init, headers });
  if (r.status === 401) {
    await removeToken();
    throw new Error("Sessão expirada");
  }
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error((data && (data.detail || data.message)) || "Erro na requisição");
  return data as T;
}

export const api = {
  get: <T=any>(p: string) => apiFetch<T>(p),
  post: <T=any>(p: string, body: unknown) => apiFetch<T>(p, { method: "POST", body: JSON.stringify(body) }),
  put: <T=any>(p: string, body: unknown) => apiFetch<T>(p, { method: "PUT", body: JSON.stringify(body) }),
  del: <T=any>(p: string) => apiFetch<T>(p, { method: "DELETE" }),
};
