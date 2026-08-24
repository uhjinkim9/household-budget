import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, LessThanOrEqual, Not, Repository } from "typeorm";
import {
  ApprovalStatus,
  BalanceMode,
  Transaction,
  TransactionType,
} from "../entities/transaction.entity";
import {
  PaymentMethod,
  PaymentMethodType,
} from "../entities/payment-method.entity";
import { AuthUser } from "../auth/auth-user.decorator";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

@UseGuards(AuthGuard("jwt"))
@Controller("dashboard")
export class DashboardController {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethods: Repository<PaymentMethod>,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get("balance")
  async balance(
    @AuthUser() user: { id: string },
    @Query("workspaceId") workspaceId: string,
    @Query("asOf") asOf: string,
  ) {
    await this.access.assertEditor(user.id, workspaceId);
    const rows = await this.transactions.find({
      where: {
        workspaceId,
        date: LessThanOrEqual(asOf),
        approvalStatus: Not(ApprovalStatus.CANCELLED),
      },
      order: { createdAt: "ASC" },
    });
    const methods = await this.paymentMethods.findBy({ workspaceId });
    const checkCardIds = new Set(
      methods
        .filter((method) => method.type === PaymentMethodType.CHECK_CARD)
        .map((method) => method.id),
    );
    const reset = rows
      .filter(
        (row) =>
          row.type === TransactionType.BALANCE &&
          row.balanceMode === BalanceMode.MONTHLY_RESET,
      )
      .at(-1);
    const resetAt = reset ? this.latestOccurrence(reset.date, asOf) : null;
    const from = resetAt ?? "0001-01-01";
    const base = reset ? Number(reset.amount) : 0;
    const accumulated = rows
      .filter(
        (row) =>
          row.type === TransactionType.BALANCE &&
          row.balanceMode !== BalanceMode.MONTHLY_RESET &&
          row.date >= from,
      )
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const checkCardSpent = rows
      .filter(
        (row) =>
          row.type !== TransactionType.BALANCE &&
          Boolean(row.paymentMethodId) &&
          checkCardIds.has(row.paymentMethodId!),
      )
      .reduce((sum, row) => {
        if (row.recurrenceRule === "MONTHLY")
          return (
            sum +
            Number(row.amount) *
              this.monthlyOccurrenceCount(row.date, from, asOf)
          );
        return row.date >= from ? sum + Number(row.amount) : sum;
      }, 0);
    return {
      balance: base + accumulated - checkCardSpent,
      mode: reset ? BalanceMode.MONTHLY_RESET : BalanceMode.CUMULATIVE,
      resetAt,
    };
  }

  @Get("summary")
  async summary(
    @AuthUser() user: { id: string },
    @Query("workspaceId") workspaceId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    await this.access.assertEditor(user.id, workspaceId);
    const rows = await this.transactions.find({
      where: {
        workspaceId,
        date: Between(from, to),
        approvalStatus: Not(ApprovalStatus.CANCELLED),
      },
    });
    const methods = await this.paymentMethods.findBy({ workspaceId });
    const spent = rows
      .filter((row) => row.type !== TransactionType.BALANCE)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const fixed = rows
      .filter((row) => row.type === TransactionType.FIXED)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const { balance } = await this.balance(user, workspaceId, to);

    const cards = methods
      .filter((method) =>
        [PaymentMethodType.CREDIT_CARD, PaymentMethodType.CHECK_CARD].includes(
          method.type,
        ),
      )
      .map((card) => {
        const used = rows
          .filter(
            (row) =>
              row.paymentMethodId === card.id && !row.isPerformanceExcluded,
          )
          .reduce((sum, row) => sum + Number(row.amount), 0);
        const target = Number(card.targetPerformance);
        return {
          id: card.id,
          name: card.name,
          billingDay: card.billingDay,
          target,
          used,
          progress: target ? Math.min(100, (used / target) * 100) : 0,
        };
      });

    return {
      spent,
      fixed,
      variable: spent - fixed,
      balance,
      count: rows.length,
      cards,
    };
  }

  @Get("category-report")
  async categoryReport(
    @AuthUser() user: { id: string },
    @Query("workspaceId") workspaceId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    await this.access.assertEditor(user.id, workspaceId);
    const rows = await this.transactions.find({
      where: {
        workspaceId,
        date: LessThanOrEqual(to),
        approvalStatus: Not(ApprovalStatus.CANCELLED),
        type: Not(TransactionType.BALANCE),
      },
    });
    const totals = new Map<string, number>();
    for (const row of rows) {
      const included =
        row.recurrenceRule === "MONTHLY"
          ? this.hasMonthlyOccurrence(row.date, from, to)
          : row.date >= from && row.date <= to;
      if (!included) continue;
      totals.set(
        row.category,
        (totals.get(row.category) ?? 0) + Number(row.amount),
      );
    }
    const categories = [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const total = categories.reduce((sum, item) => sum + item.amount, 0);
    return {
      total,
      categories: categories.map((item) => ({
        ...item,
        percentage: total ? (item.amount / total) * 100 : 0,
      })),
    };
  }

  private latestOccurrence(masterDate: string, asOf: string) {
    const [masterYear, masterMonth, masterDay] = masterDate
      .split("-")
      .map(Number);
    const [asOfYear, asOfMonth] = asOf.split("-").map(Number);
    let year = asOfYear;
    let month = asOfMonth;
    let candidate = this.dateWithClampedDay(year, month, masterDay);
    if (candidate > asOf) {
      month -= 1;
      if (month === 0) {
        year -= 1;
        month = 12;
      }
      candidate = this.dateWithClampedDay(year, month, masterDay);
    }
    const startsAt = `${masterYear}-${String(masterMonth).padStart(2, "0")}-${String(masterDay).padStart(2, "0")}`;
    return candidate >= startsAt ? candidate : startsAt;
  }

  private dateWithClampedDay(year: number, month: number, day: number) {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  }

  private monthlyOccurrenceCount(masterDate: string, from: string, to: string) {
    const [masterYear, masterMonth, masterDay] = masterDate
      .split("-")
      .map(Number);
    const [fromYear, fromMonth] = from.split("-").map(Number);
    const [toYear, toMonth] = to.split("-").map(Number);
    const masterIndex = masterYear * 12 + masterMonth - 1;
    const fromIndex = fromYear * 12 + fromMonth - 1;
    const toIndex = toYear * 12 + toMonth - 1;
    let count = 0;
    for (
      let index = Math.max(masterIndex, fromIndex);
      index <= toIndex;
      index++
    ) {
      const year = Math.floor(index / 12);
      const month = (index % 12) + 1;
      const occurrence = this.dateWithClampedDay(year, month, masterDay);
      if (occurrence >= masterDate && occurrence >= from && occurrence <= to)
        count += 1;
    }
    return count;
  }

  private hasMonthlyOccurrence(masterDate: string, from: string, to: string) {
    const [, , masterDay] = masterDate.split("-").map(Number);
    const [year, month] = from.split("-").map(Number);
    const occurrence = this.dateWithClampedDay(year, month, masterDay);
    return occurrence >= masterDate && occurrence >= from && occurrence <= to;
  }
}
