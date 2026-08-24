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
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import {
  BalanceMode,
  TransactionType,
} from "../entities/transaction.entity";
import { TransactionService } from "./transaction.service";

class TransactionRangeDto {
  @IsUUID()
  workspaceId!: string;

  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;
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
}

@UseGuards(AuthGuard("jwt"))
@Controller("transactions")
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  list(@Query() query: TransactionRangeDto) {
    return this.transactions.list(query.workspaceId, query.from, query.to);
  }

  @Post()
  create(@Body() dto: CreateDto) {
    return this.transactions.create({
      ...dto,
      paymentMethodId: dto.paymentMethodId ?? null,
      recurrenceRule: dto.recurrenceRule ?? null,
      balanceMode:
        dto.type === TransactionType.BALANCE
          ? (dto.balanceMode ?? BalanceMode.CUMULATIVE)
          : null,
      amount: String(dto.amount),
    });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: CreateDto) {
    return this.transactions.update(id, dto.workspaceId, {
      ...dto,
      paymentMethodId: dto.paymentMethodId ?? null,
      recurrenceRule: dto.recurrenceRule ?? null,
      balanceMode:
        dto.type === TransactionType.BALANCE
          ? (dto.balanceMode ?? BalanceMode.CUMULATIVE)
          : null,
      amount: String(dto.amount),
    });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.transactions.remove(id, workspaceId);
  }
}
