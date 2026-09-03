export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: SessionUser;
}

export const USER_KEY = "budget-user";
export const ACTIVE_WORKSPACE_KEY = "budget-active-workspace";
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

let refreshPromise: Promise<boolean> | null = null;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await fetchWithAccessToken(path, init);
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      expireSession();
      throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
    }
    response = await fetchWithAccessToken(path, init);
    if (response.status === 401) {
      expireSession();
      throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
    }
  }
  return parseResponse<T>(response);
}

export async function publicPost<T>(
  path: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(response);
}

export function storeSession(data: AuthResponse) {
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function removeStoredSession() {
  localStorage.removeItem("budget-token");
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}

async function fetchWithAccessToken(path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = publicPost<AuthResponse>("/auth/refresh")
      .then((session) => {
        storeSession(session);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function expireSession() {
  if (typeof window === "undefined") return;
  removeStoredSession();
  window.dispatchEvent(new Event("budget:session-expired"));
  if (window.location.pathname !== "/login") {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    window.location.replace(
      `/login?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message;
    throw new Error(message ?? "요청에 실패했습니다.");
  }
  return body as T;
}
