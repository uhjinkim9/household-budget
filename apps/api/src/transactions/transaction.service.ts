import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Not, Repository } from "typeorm";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { NotificationPublisher } from "../notifications/notification-publisher";

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly notifications: NotificationPublisher,
  ) {}

  list(workspaceId: string, from: string, to: string, viewerOnly = false) {
    return this.transactions.find({
      where: {
        workspaceId,
        date: Between(from, to),
        ...(viewerOnly ? { type: Not(TransactionType.BALANCE) } : {}),
      },
      order: { date: "ASC", createdAt: "ASC" },
    });
  }

  async create(data: Partial<Transaction>) {
    const transaction = await this.transactions.save(
      this.transactions.create(data),
    );
    void this.notifications.transactionCreated(transaction);
    return transaction;
  }

  async update(id: string, workspaceId: string, data: Partial<Transaction>) {
    const item = await this.transactions.findOneBy({ id, workspaceId });
    if (!item) throw new NotFoundException();
    Object.assign(item, data, { id, workspaceId });
    return this.transactions.save(item);
  }

  async remove(id: string, workspaceId: string) {
    const item = await this.transactions.findOneBy({ id, workspaceId });
    if (!item) throw new NotFoundException();
    await this.transactions.remove(item);
    return { id };
  }
}
