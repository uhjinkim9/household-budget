import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { Repository } from "typeorm";
import { ApiKeyCryptoService } from "../api-keys/api-key-crypto.service";
import { NotificationImportDevice } from "../entities/notification-import-device.entity";
import { PaymentMethod } from "../entities/payment-method.entity";
import {
  NotificationEventType,
  NotificationImport,
  NotificationImportStatus,
} from "../entities/notification-import.entity";
import {
  ApprovalStatus,
  TransactionType,
} from "../entities/transaction.entity";
import { TransactionService } from "../transactions/transaction.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import { parseFinancialNotification } from "./notification-parser";

export interface NotificationEventInput {
  packageName: string;
  appName?: string;
  title?: string;
  text: string;
  postedAt: string;
  notificationKey: string;
}

@Injectable()
export class NotificationImportService {
  constructor(
    @InjectRepository(NotificationImportDevice)
    private readonly devices: Repository<NotificationImportDevice>,
    @InjectRepository(NotificationImport)
    private readonly imports: Repository<NotificationImport>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethods: Repository<PaymentMethod>,
    private readonly access: WorkspaceAccessService,
    private readonly crypto: ApiKeyCryptoService,
    private readonly transactions: TransactionService,
  ) {}

  async issueDevice(userId: string, workspaceId: string, name: string) {
    await this.access.assertEditor(userId, workspaceId);
    const token = `hb_android_${randomBytes(32).toString("base64url")}`;
    const device = await this.devices.save(
      this.devices.create({
        workspaceId,
        userId,
        name: name.trim(),
        tokenHash: this.hash(token),
        lastSeenAt: null,
        revokedAt: null,
      }),
    );
    return { ...this.presentDevice(device), token };
  }

  async listDevices(userId: string, workspaceId: string) {
    await this.access.assertViewer(userId, workspaceId);
    return (await this.devices.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    })).map((device) => this.presentDevice(device));
  }

  async revokeDevice(userId: string, workspaceId: string, id: string) {
    await this.access.assertEditor(userId, workspaceId);
    const device = await this.devices.findOneBy({ id, workspaceId });
    if (!device) throw new NotFoundException("연결된 기기를 찾을 수 없습니다.");
    device.revokedAt = new Date();
    await this.devices.save(device);
    return { id };
  }

  async ingest(token: string | undefined, input: NotificationEventInput) {
    const device = await this.authenticateDevice(token);
    const postedAt = new Date(input.postedAt);
    const parsed = parseFinancialNotification(
      input.title?.trim() ?? "",
      input.text.trim(),
      postedAt,
    );
    const deduplicationKey = this.hash(
      `${input.notificationKey}\n${input.packageName}\n${input.postedAt}\n${input.title ?? ""}\n${input.text}`,
    );
    const existing = await this.imports.findOneBy({
      deviceId: device.id,
      deduplicationKey,
    });
    if (existing) return { id: existing.id, duplicate: true };
    const record = await this.imports.save(
      this.imports.create({
        workspaceId: device.workspaceId,
        deviceId: device.id,
        deduplicationKey,
        sourcePackage: input.packageName,
        sourceApp: input.appName?.trim() || null,
        merchant: parsed.merchant,
        amount: parsed.amount === null ? null : String(Math.abs(parsed.amount)),
        occurredAt: parsed.occurredAt,
        eventType: parsed.eventType,
        status: NotificationImportStatus.PENDING,
        parserConfidence: parsed.confidence,
        rawDataEncrypted: this.crypto.encrypt(
          JSON.stringify({ title: input.title ?? "", text: input.text }),
        ),
        transactionId: null,
      }),
    );
    device.lastSeenAt = new Date();
    await this.devices.save(device);
    return { id: record.id, duplicate: false };
  }

  async listImports(userId: string, workspaceId: string) {
    await this.access.assertViewer(userId, workspaceId);
    return this.imports.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async accept(
    userId: string,
    workspaceId: string,
    id: string,
    input: { category: string; paymentMethodId?: string; title?: string },
  ) {
    await this.access.assertEditor(userId, workspaceId);
    const item = await this.imports.findOneBy({ id, workspaceId });
    if (!item) throw new NotFoundException("자동등록 후보를 찾을 수 없습니다.");
    if (item.status !== NotificationImportStatus.PENDING)
      throw new ConflictException("이미 처리된 자동등록 후보입니다.");
    if (item.amount === null)
      throw new ConflictException("금액을 인식하지 못해 거래로 등록할 수 없습니다.");
    if (
      input.paymentMethodId &&
      !(await this.paymentMethods.existsBy({
        id: input.paymentMethodId,
        workspaceId,
      }))
    )
      throw new BadRequestException("이 가계의 결제 수단이 아닙니다.");
    const transaction = await this.transactions.create({
      workspaceId,
      paymentMethodId: input.paymentMethodId ?? null,
      type: TransactionType.VARIABLE,
      amount: item.amount,
      title: input.title?.trim() || item.merchant || item.sourceApp || "카드 결제",
      category: input.category.trim(),
      memo: "Android 결제 알림에서 등록",
      date: this.localDate(item.occurredAt),
      recurrenceRule: null,
      balanceMode: null,
      isPerformanceExcluded: false,
      externalTransactionId: `notification:${item.deduplicationKey}`,
      approvalStatus:
        item.eventType === NotificationEventType.CANCELLED
          ? ApprovalStatus.CANCELLED
          : ApprovalStatus.APPROVED,
      rawData: {
        source: "ANDROID_NOTIFICATION",
        sourcePackage: item.sourcePackage,
        importId: item.id,
      },
    });
    item.status = NotificationImportStatus.IMPORTED;
    item.transactionId = transaction.id;
    await this.imports.save(item);
    return transaction;
  }

  async ignore(userId: string, workspaceId: string, id: string) {
    await this.access.assertEditor(userId, workspaceId);
    const item = await this.imports.findOneBy({ id, workspaceId });
    if (!item) throw new NotFoundException("자동등록 후보를 찾을 수 없습니다.");
    if (item.status === NotificationImportStatus.IMPORTED)
      throw new ConflictException("등록된 거래는 거래 내역에서 삭제해주세요.");
    item.status = NotificationImportStatus.IGNORED;
    await this.imports.save(item);
    return { id };
  }

  private async authenticateDevice(token: string | undefined) {
    if (!token?.startsWith("hb_android_"))
      throw new UnauthorizedException("Android 기기 토큰이 필요합니다.");
    const device = await this.devices
      .createQueryBuilder("device")
      .addSelect("device.tokenHash")
      .where("device.tokenHash = :tokenHash", { tokenHash: this.hash(token) })
      .getOne();
    if (!device || device.revokedAt)
      throw new ForbiddenException("유효하지 않거나 해제된 기기입니다.");
    return device;
  }

  private presentDevice(device: NotificationImportDevice) {
    return {
      id: device.id,
      workspaceId: device.workspaceId,
      name: device.name,
      lastSeenAt: device.lastSeenAt,
      revokedAt: device.revokedAt,
      createdAt: device.createdAt,
    };
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private localDate(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}
