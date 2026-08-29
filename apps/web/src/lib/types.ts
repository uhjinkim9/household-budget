export interface DailyNote {
  id: string;
  workspaceId: string;
  date: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "FIXED" | "VARIABLE" | "BALANCE";
export type BalanceMode = "CUMULATIVE" | "MONTHLY_RESET";
export interface TransactionFoodItem {
  id?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  expirationDate?: string | null;
}
export interface Transaction {
  id: string;
  workspaceId: string;
  paymentMethodId?: string;
  type: TransactionType;
  amount: number;
  title: string;
  category: string;
  memo?: string | null;
  date: string;
  recurrenceRule?: string;
  balanceMode?: BalanceMode | null;
  foodItems?: TransactionFoodItem[];
}
export type PaymentMethodType =
  "CREDIT_CARD" | "CHECK_CARD" | "BANK_ACCOUNT" | "CASH";
export interface PaymentMethod {
  id: string;
  workspaceId?: string;
  name: string;
  type: PaymentMethodType;
  cardIssuer?: string | null;
  billingDay?: number | null;
  targetPerformance?: number | null;
  annualFee?: number | null;
  createdAt?: string;
}
