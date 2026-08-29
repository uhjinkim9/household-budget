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
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { BalanceMode, TransactionType } from "../entities/transaction.entity";
import { TransactionService } from "./transaction.service";
import { AuthUser } from "../auth/auth-user.decorator";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import { WorkspaceRole } from "../entities/workspace.entity";

class TransactionRangeDto {
  @IsUUID()
  workspaceId!: string;

  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;
}

class FoodItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsDateString({ strict: true })
  expirationDate?: string;
}

class CreateDto {
  @IsUUID()
  workspaceId!: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  amount!: number;

  @IsString()
  title!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @IsDateString({ strict: true })
  date!: string;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @IsOptional()
  @IsEnum(BalanceMode)
  balanceMode?: BalanceMode;

  @IsOptional()
  @IsBoolean()
  isPerformanceExcluded?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodItemDto)
  foodItems?: FoodItemDto[];
}

@UseGuards(AuthGuard("jwt"))
@Controller("transactions")
export class TransactionController {
  constructor(
    private readonly transactions: TransactionService,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get()
  async list(
    @AuthUser() user: { id: string },
    @Query() query: TransactionRangeDto,
  ) {
    const member = await this.access.assertViewer(user.id, query.workspaceId);
    return this.transactions.list(
      query.workspaceId,
      query.from,
      query.to,
      member.role === WorkspaceRole.VIEWER,
    );
  }

  @Post()
  async create(@AuthUser() user: { id: string }, @Body() dto: CreateDto) {
    await this.access.assertEditor(user.id, dto.workspaceId);
    return this.transactions.create({
      ...dto,
      paymentMethodId: dto.paymentMethodId ?? null,
      recurrenceRule: dto.recurrenceRule ?? null,
      memo: dto.memo?.trim() || null,
      balanceMode:
        dto.type === TransactionType.BALANCE
          ? (dto.balanceMode ?? BalanceMode.CUMULATIVE)
          : null,
      amount: String(dto.amount),
    });
  }

  @Patch(":id")
  async update(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: CreateDto,
  ) {
    await this.access.assertEditor(user.id, dto.workspaceId);
    return this.transactions.update(id, dto.workspaceId, {
      ...dto,
      paymentMethodId: dto.paymentMethodId ?? null,
      recurrenceRule: dto.recurrenceRule ?? null,
      memo: dto.memo?.trim() || null,
      balanceMode:
        dto.type === TransactionType.BALANCE
          ? (dto.balanceMode ?? BalanceMode.CUMULATIVE)
          : null,
      amount: String(dto.amount),
    });
  }

  @Delete(":id")
  async remove(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    await this.access.assertEditor(user.id, workspaceId);
    return this.transactions.remove(id, workspaceId);
  }
}
