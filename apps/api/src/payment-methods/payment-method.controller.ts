import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.decorator";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import {
  PaymentMethod,
  PaymentMethodType,
} from "../entities/payment-method.entity";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
class PaymentMethodDto {
  @IsUUID() workspaceId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsEnum(PaymentMethodType) type!: PaymentMethodType;
  @IsOptional() @IsString() cardIssuer?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) billingDay?: number;
  @IsOptional() @IsNumber() @Min(0) targetPerformance?: number;
  @IsOptional() @IsNumber() @Min(0) annualFee?: number;
}
@UseGuards(AuthGuard("jwt"))
@Controller("payment-methods")
export class PaymentMethodController {
  constructor(
    @InjectRepository(PaymentMethod) private r: Repository<PaymentMethod>,
    private readonly access: WorkspaceAccessService,
  ) {}
  @Get() async list(
    @AuthUser() user: { id: string },
    @Query("workspaceId") workspaceId: string,
  ) {
    await this.access.assertViewer(user.id, workspaceId);
    return this.r.find({ where: { workspaceId }, order: { createdAt: "ASC" } });
  }
  @Post() async create(
    @AuthUser() user: { id: string },
    @Body() d: PaymentMethodDto,
  ) {
    await this.access.assertOwner(user.id, d.workspaceId);
    return this.r.save(this.r.create(this.normalize(d)));
  }
  @Patch(":id") async update(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body() d: PaymentMethodDto,
  ) {
    await this.access.assertOwner(user.id, d.workspaceId);
    const item = await this.r.findOneBy({ id, workspaceId: d.workspaceId });
    if (!item) throw new NotFoundException();
    Object.assign(item, this.normalize(d));
    return this.r.save(item);
  }
  @Delete(":id") async remove(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    await this.access.assertOwner(user.id, workspaceId);
    const item = await this.r.findOneBy({ id, workspaceId });
    if (!item) throw new NotFoundException();
    await this.r.remove(item);
    return { id };
  }
  private normalize(d: PaymentMethodDto) {
    const isCard =
      d.type === PaymentMethodType.CREDIT_CARD ||
      d.type === PaymentMethodType.CHECK_CARD;
    return {
      workspaceId: d.workspaceId,
      name: d.name.trim(),
      type: d.type,
      cardIssuer: isCard ? d.cardIssuer?.trim() || null : null,
      targetPerformance: isCard ? String(d.targetPerformance ?? 0) : null,
      billingDay:
        d.type === PaymentMethodType.CREDIT_CARD
          ? (d.billingDay ?? null)
          : null,
      annualFee:
        d.type === PaymentMethodType.CREDIT_CARD
          ? String(d.annualFee ?? 0)
          : null,
    };
  }
}
