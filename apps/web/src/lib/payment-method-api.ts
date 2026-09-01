import { request } from "./http";
import type { PaymentMethod } from "./types";

export type PaymentMethodPayload = Omit<PaymentMethod, "id" | "createdAt">;

export const paymentMethodApi = {
  create: (body: PaymentMethodPayload) =>
    request<PaymentMethod>("/payment-methods", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: PaymentMethodPayload) =>
    request<PaymentMethod>(`/payment-methods/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id: string, workspaceId: string) =>
    request(`/payment-methods/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
    }),
};
