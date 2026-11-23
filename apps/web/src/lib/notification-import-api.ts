import type { Transaction } from "./types";
import { request } from "./http";

export interface NotificationImportDevice {
  id: string;
  workspaceId: string;
  name: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface NotificationImportItem {
  id: string;
  sourcePackage: string;
  sourceApp: string | null;
  merchant: string | null;
  amount: number | null;
  occurredAt: string;
  eventType: "APPROVED" | "CANCELLED" | "UNKNOWN";
  status: "PENDING" | "IMPORTED" | "IGNORED";
  parserConfidence: number;
  transactionId: string | null;
  createdAt: string;
}

export const notificationImportApi = {
  devices: (workspaceId: string) =>
    request<NotificationImportDevice[]>(
      `/notification-imports/devices?workspaceId=${workspaceId}`,
    ),
  issueDevice: (workspaceId: string, name: string) =>
    request<NotificationImportDevice & { token: string }>(
      "/notification-imports/devices",
      { method: "POST", body: JSON.stringify({ workspaceId, name }) },
    ),
  revokeDevice: (workspaceId: string, id: string) =>
    request<{ id: string }>(
      `/notification-imports/devices/${id}?workspaceId=${workspaceId}`,
      { method: "DELETE" },
    ),
  items: (workspaceId: string) =>
    request<NotificationImportItem[]>(
      `/notification-imports?workspaceId=${workspaceId}`,
    ),
  accept: (
    id: string,
    body: {
      workspaceId: string;
      category: string;
      paymentMethodId?: string;
      title?: string;
    },
  ) =>
    request<Transaction>(`/notification-imports/${id}/accept`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ignore: (id: string, workspaceId: string) =>
    request<{ id: string }>(`/notification-imports/${id}/ignore`, {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    }),
};
