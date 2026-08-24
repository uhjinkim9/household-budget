import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { AuthUser } from "../auth/auth-user.decorator";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import { DiscordWebhookService } from "./discord-webhook.service";

class WorkspaceQueryDto {
  @IsUUID()
  workspaceId!: string;
}

class CreateDiscordWebhookDto extends WorkspaceQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsUrl({ protocols: ["https"], require_protocol: true })
  webhookUrl!: string;
}

class UpdateDiscordWebhookDto extends WorkspaceQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  webhookUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@UseGuards(AuthGuard("jwt"))
@Controller("discord-webhooks")
export class DiscordWebhookController {
  constructor(
    private readonly webhooks: DiscordWebhookService,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get()
  async list(
    @AuthUser() user: { id: string },
    @Query() query: WorkspaceQueryDto,
  ) {
    await this.access.assertOwner(user.id, query.workspaceId);
    return this.webhooks.list(query.workspaceId);
  }

  @Post()
  async create(
    @AuthUser() user: { id: string },
    @Body() dto: CreateDiscordWebhookDto,
  ) {
    await this.access.assertOwner(user.id, dto.workspaceId);
    return this.webhooks.create(
      dto.workspaceId,
      user.id,
      dto.name,
      dto.webhookUrl,
    );
  }

  @Patch(":id")
  async update(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateDiscordWebhookDto,
  ) {
    await this.access.assertOwner(user.id, dto.workspaceId);
    return this.webhooks.update(id, dto.workspaceId, dto);
  }

  @Delete(":id")
  async remove(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Query() query: WorkspaceQueryDto,
  ) {
    await this.access.assertOwner(user.id, query.workspaceId);
    return this.webhooks.remove(id, query.workspaceId);
  }

  @Post(":id/test")
  async test(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: WorkspaceQueryDto,
  ) {
    await this.access.assertOwner(user.id, dto.workspaceId);
    return this.webhooks.test(id, dto.workspaceId);
  }
}
