import type { DailyNote, PaymentMethod, Transaction } from "./types";

export interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  createdAt?: string;
  role: "OWNER" | "MEMBER" | "VIEWER";
}

export interface Holiday {
  date: string;
  name: string;
}

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const ACTIVE_WORKSPACE_KEY = "budget-active-workspace";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("budget-token") : null;
  if (!token) throw new Error("로그인이 필요합니다.");

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message[0]
        : (body.message ?? "요청에 실패했습니다."),
    );
  return body as T;
}

async function listWorkspaces() {
  return request<Workspace[]>("/workspaces");
}

async function getActiveWorkspace(): Promise<Workspace | null> {
  const list = await listWorkspaces();
  if (!list.length) {
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    return null;
  }
  const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  const selected = list.find((item) => item.id === stored) ?? list[0];
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected.id);
  return selected;
}

async function requireActiveWorkspace(): Promise<Workspace> {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    window.location.replace("/onboarding/workspace");
    return new Promise(() => {});
  }
  return workspace;
}

export const api = {
  listWorkspaces,
  getActiveWorkspace,
  getOrCreateWorkspace: requireActiveWorkspace,
  setActiveWorkspace: (id: string) =>
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id),
  createWorkspace: (name: string) =>
    request<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateWorkspace: (id: string, name: string) =>
    request<Workspace>(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteWorkspace: (id: string) =>
    request<{ id: string }>(`/workspaces/${id}`, { method: "DELETE" }),
  joinWorkspace: (code: string) =>
    request<Workspace>("/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  transactions: (workspaceId: string, from: string, to: string) =>
    request<Transaction[]>(
      `/transactions?workspaceId=${workspaceId}&from=${from}&to=${to}`,
    ),
  createTransaction: (body: Omit<Transaction, "id">) =>
    request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTransaction: (id: string, body: Omit<Transaction, "id">) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTransaction: (id: string, workspaceId: string) =>
    request<{ id: string }>(`/transactions/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
    }),
  dashboardBalance: (workspaceId: string, asOf: string) =>
    request<{
      balance: number;
      mode: "CUMULATIVE" | "MONTHLY_RESET";
      resetAt: string | null;
    }>(`/dashboard/balance?workspaceId=${workspaceId}&asOf=${asOf}`),
  nextCardPaymentBalance: (workspaceId: string, asOf: string) =>
    request<{ paymentDate: string; balance: number } | null>(
      `/dashboard/next-card-payment-balance?workspaceId=${workspaceId}&asOf=${asOf}`,
    ),
  categoryReport: (workspaceId: string, from: string, to: string) =>
    request<{
      total: number;
      categories: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
    }>(
      `/dashboard/category-report?workspaceId=${workspaceId}&from=${from}&to=${to}`,
    ),
  paymentMethods: (workspaceId: string) =>
    request<PaymentMethod[]>(`/payment-methods?workspaceId=${workspaceId}`),
  holidays: (year: number) => request<Holiday[]>(`/holidays?year=${year}`),
  dailyNotes: (workspaceId: string, from: string, to: string) =>
    request<DailyNote[]>(
      `/daily-notes?workspaceId=${workspaceId}&from=${from}&to=${to}`,
    ),
  createDailyNote: (body: {
    workspaceId: string;
    date: string;
    content: string;
  }) =>
    request<DailyNote>("/daily-notes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateDailyNote: (
    id: string,
    body: { workspaceId: string; date: string; content: string },
  ) =>
    request<DailyNote>(`/daily-notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteDailyNote: (id: string, workspaceId: string) =>
    request<{ id: string }>(`/daily-notes/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
    }),
};
