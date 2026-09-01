import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DataSource, Not, Repository } from "typeorm";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { TransactionFoodItem } from "../entities/transaction-food-item.entity";
import { NotificationPublisher } from "../notifications/notification-publisher";
import { PaymentMethod, PaymentMethodType } from "../entities/payment-method.entity";

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethods: Repository<PaymentMethod>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationPublisher,
  ) {}

  list(workspaceId: string, from: string, to: string, viewerOnly = false) {
    return this.transactions.find({
      where: {
        workspaceId,
        date: Between(from, to),
        ...(viewerOnly ? { type: Not(TransactionType.BALANCE) } : {}),
      },
      relations: { foodItems: true },
      order: { date: "ASC", createdAt: "ASC" },
    });
  }

  async create(data: TransactionWriteData) {
    await this.validateBalanceAdjustment(data);
    const { foodItems = [], ...transactionData } = data;
    const transaction = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        Transaction,
        manager.create(Transaction, transactionData),
      );
      if (foodItems.length) {
        await manager.save(
          TransactionFoodItem,
          foodItems.map((item) =>
            manager.create(TransactionFoodItem, {
              ...item,
              unitPrice: String(item.unitPrice),
              quantity: Number(item.quantity),
              transactionId: saved.id,
            }),
          ),
        );
      }
      return manager.findOneOrFail(Transaction, {
        where: { id: saved.id },
        relations: { foodItems: true },
      });
    });
    void this.notifications.transactionCreated(transaction);
    return transaction;
  }

  async update(id: string, workspaceId: string, data: TransactionWriteData) {
    await this.validateBalanceAdjustment(data);
    const { foodItems = [], ...transactionData } = data;
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOneBy(Transaction, { id, workspaceId });
      if (!item) throw new NotFoundException();
      Object.assign(item, transactionData, { id, workspaceId });
      await manager.save(Transaction, item);
      await manager.delete(TransactionFoodItem, { transactionId: id });
      if (foodItems.length) {
        await manager.save(
          TransactionFoodItem,
          foodItems.map((foodItem) =>
            manager.create(TransactionFoodItem, {
              ...foodItem,
              unitPrice: String(foodItem.unitPrice),
              quantity: Number(foodItem.quantity),
              transactionId: id,
            }),
          ),
        );
      }
      return manager.findOneOrFail(Transaction, {
        where: { id, workspaceId },
        relations: { foodItems: true },
      });
    });
  }

  async remove(id: string, workspaceId: string) {
    const item = await this.transactions.findOneBy({ id, workspaceId });
    if (!item) throw new NotFoundException();
    await this.transactions.remove(item);
    return { id };
  }

  private async validateBalanceAdjustment(data: TransactionWriteData) {
    const amount = Number(data.amount);
    if (data.type !== TransactionType.BALANCE && amount < 0) {
      throw new BadRequestException("지출 금액에는 음수를 입력할 수 없습니다.");
    }
    if (
      data.type !== TransactionType.BALANCE ||
      amount >= 0 ||
      !data.paymentMethodId
    ) {
      return;
    }
    const card = await this.paymentMethods.findOneBy({
      id: data.paymentMethodId,
      workspaceId: data.workspaceId,
    });
    if (!card || card.type !== PaymentMethodType.CREDIT_CARD) {
      throw new BadRequestException("선결제할 신용카드를 확인해주세요.");
    }
  }
}

type TransactionWriteData = Omit<Partial<Transaction>, "foodItems"> & {
  foodItems?: Array<
    Omit<Partial<TransactionFoodItem>, "unitPrice"> & {
      unitPrice?: string | number;
    }
  >;
};
