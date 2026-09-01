import { request } from "./http";

export function leaveWorkspace(workspaceId: string) {
  return request<{ workspaceId: string }>(`/workspaces/${workspaceId}/leave`, {
    method: "DELETE",
  });
}
