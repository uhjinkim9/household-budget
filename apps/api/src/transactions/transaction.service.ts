import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity";

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  list(workspaceId: string, from: string, to: string) {
    return this.transactions.find({
      where: { workspaceId, date: Between(from, to) },
      order: { date: "ASC", createdAt: "ASC" },
    });
  }

  create(data: Partial<Transaction>) {
    return this.transactions.save(this.transactions.create(data));
  }

  async update(
    id: string,
    workspaceId: string,
    data: Partial<Transaction>,
  ) {
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

