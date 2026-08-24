import type { Workspace } from "./api";
export interface WorkspaceMember {
  id: string;
  userId: string;
  role: "OWNER" | "MEMBER" | "VIEWER";
  joinedAt: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
}
export interface WorkspaceCategory {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}
export interface WorkspaceSettings {
  workspace: Workspace;
  members: WorkspaceMember[];
  categories: WorkspaceCategory[];
}
export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  inviteCode: string;
  usedCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}
const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
async function request<T>(path: string, init?: RequestInit) {
  const token = localStorage.getItem("budget-token"),
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    }),
    body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message[0]
        : (body.message ?? "요청에 실패했습니다."),
    );
  return body as T;
}
export const workspaceSettingsApi = {
  get: (id: string) => request<WorkspaceSettings>(`/workspaces/${id}/settings`),
  removeMember: (workspaceId: string, memberId: string) =>
    request(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    }),
  addCategory: (workspaceId: string, body: { name: string; color: string }) =>
    request<WorkspaceCategory>(`/workspaces/${workspaceId}/categories`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCategory: (
    workspaceId: string,
    id: string,
    body: { name?: string; color?: string; isActive?: boolean },
  ) =>
    request<WorkspaceCategory>(`/workspaces/${workspaceId}/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  removeCategory: (workspaceId: string, id: string) =>
    request(`/workspaces/${workspaceId}/categories/${id}`, {
      method: "DELETE",
    }),
  invites: (workspaceId: string) =>
    request<WorkspaceInvite[]>(`/workspaces/${workspaceId}/invites`),
  issueInvite: (workspaceId: string) =>
    request<WorkspaceInvite>(`/workspaces/${workspaceId}/invites`, {
      method: "POST",
    }),
  revokeInvite: (workspaceId: string, inviteId: string) =>
    request<{ id: string }>(`/workspaces/${workspaceId}/invites/${inviteId}`, {
      method: "DELETE",
    }),
};
