import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKeyCryptoService } from "../api-keys/api-key-crypto.service";
import { DiscordWebhook } from "../entities/discord-webhook.entity";

@Injectable()
export class DiscordWebhookService {
  constructor(
    @InjectRepository(DiscordWebhook)
    private readonly webhooks: Repository<DiscordWebhook>,
    private readonly crypto: ApiKeyCryptoService,
  ) {}

  list(workspaceId: string) {
    return this.webhooks.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  async create(
    workspaceId: string,
    createdBy: string,
    name: string,
    url: string,
  ) {
    this.assertDiscordUrl(url);
    if (await this.webhooks.existsBy({ workspaceId }))
      throw new BadRequestException(
        "가계에는 Discord 웹훅을 하나만 등록할 수 있습니다.",
      );
    const webhook = await this.webhooks.save(
      this.webhooks.create({
        workspaceId,
        createdBy,
        name: name.trim(),
        webhookUrlEncrypted: this.crypto.encrypt(url.trim()),
      }),
    );
    return this.toPublic(webhook);
  }

  async update(
    id: string,
    workspaceId: string,
    input: { name?: string; webhookUrl?: string; isActive?: boolean },
  ) {
    const webhook = await this.webhooks
      .createQueryBuilder("webhook")
      .addSelect("webhook.webhookUrlEncrypted")
      .where("webhook.id = :id AND webhook.workspaceId = :workspaceId", {
        id,
        workspaceId,
      })
      .getOne();
    if (!webhook)
      throw new NotFoundException("Discord 웹훅을 찾을 수 없습니다.");
    if (input.name !== undefined) webhook.name = input.name.trim();
    if (input.isActive !== undefined) webhook.isActive = input.isActive;
    if (input.webhookUrl !== undefined) {
      this.assertDiscordUrl(input.webhookUrl);
      webhook.webhookUrlEncrypted = this.crypto.encrypt(
        input.webhookUrl.trim(),
      );
    }
    return this.toPublic(await this.webhooks.save(webhook));
  }

  async remove(id: string, workspaceId: string) {
    const webhook = await this.webhooks.findOneBy({ id, workspaceId });
    if (!webhook)
      throw new NotFoundException("Discord 웹훅을 찾을 수 없습니다.");
    await this.webhooks.softRemove(webhook);
    return { id };
  }

  async test(id: string, workspaceId: string) {
    const webhook = await this.findWithSecret(id, workspaceId);
    await this.deliver(
      webhook,
      "🔔 Mercury Lab 가계부 Discord 알림 테스트입니다.",
    );
    return { delivered: true };
  }

  async sendToWorkspace(workspaceId: string, content: string) {
    const webhooks = await this.webhooks
      .createQueryBuilder("webhook")
      .addSelect("webhook.webhookUrlEncrypted")
      .where("webhook.workspaceId = :workspaceId", { workspaceId })
      .andWhere("webhook.isActive = true")
      .andWhere("webhook.deletedAt IS NULL")
      .getMany();
    await Promise.allSettled(
      webhooks.map((webhook) => this.deliver(webhook, content)),
    );
  }

  private async findWithSecret(id: string, workspaceId: string) {
    const webhook = await this.webhooks
      .createQueryBuilder("webhook")
      .addSelect("webhook.webhookUrlEncrypted")
      .where("webhook.id = :id AND webhook.workspaceId = :workspaceId", {
        id,
        workspaceId,
      })
      .getOne();
    if (!webhook)
      throw new NotFoundException("Discord 웹훅을 찾을 수 없습니다.");
    return webhook;
  }

  private async deliver(webhook: DiscordWebhook, content: string) {
    try {
      const response = await fetch(
        this.crypto.decrypt(webhook.webhookUrlEncrypted),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "Mercury Lab Household Budget",
            content: content.slice(0, 2000),
          }),
          signal: AbortSignal.timeout(7_000),
        },
      );
      if (!response.ok) throw new Error(`Discord 응답 코드 ${response.status}`);
      webhook.lastSentAt = new Date();
      webhook.lastError = null;
      await this.webhooks.save(webhook);
    } catch (error) {
      webhook.lastError = (
        error instanceof Error ? error.message : "전송 실패"
      ).slice(0, 500);
      await this.webhooks.save(webhook);
      throw error;
    }
  }

  private assertDiscordUrl(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException("올바른 Discord 웹훅 URL을 입력해주세요.");
    }
    const allowedHosts = new Set(["discord.com", "discordapp.com"]);
    if (
      url.protocol !== "https:" ||
      !allowedHosts.has(url.hostname) ||
      !url.pathname.startsWith("/api/webhooks/")
    ) {
      throw new BadRequestException(
        "Discord 공식 웹훅 URL만 등록할 수 있습니다.",
      );
    }
  }

  private toPublic(webhook: DiscordWebhook) {
    const { webhookUrlEncrypted: _, ...publicWebhook } = webhook;
    return publicWebhook;
  }
}
