import type { Transaction } from "../entities/transaction.entity";

export abstract class NotificationPublisher {
  abstract transactionCreated(transaction: Transaction): Promise<void>;
}
