import { request } from "./http";

export interface OpenBankingAccount {
  id: string;
  bankName: string;
  accountAlias: string | null;
  accountNumMasked: string;
  accountHolderName: string | null;
  accountType: string | null;
  balanceAmt: string | null;
  availableAmt: string | null;
  productName: string | null;
  balanceSyncedAt: string | null;
}

export interface OpenBankingStatus {
  configured: boolean;
  connected: boolean;
  balanceEnabled: boolean;
  accounts: OpenBankingAccount[];
}

export const openBankingApi = {
  status: () =>
    request<OpenBankingStatus>("/integrations/open-banking/accounts"),
  connect: () =>
    request<{ authorizationUrl: string }>(
      "/integrations/open-banking/connect",
      { method: "POST" },
    ),
  refresh: () =>
    request<OpenBankingStatus>(
      "/integrations/open-banking/accounts/refresh",
      { method: "POST" },
    ),
  refreshAfterLogin: () => {
    if (process.env.NODE_ENV !== "production") return Promise.resolve(null);
    return request<OpenBankingStatus>(
      "/integrations/open-banking/accounts/refresh",
      { method: "POST" },
    );
  },
};
