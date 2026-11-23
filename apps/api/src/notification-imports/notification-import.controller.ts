import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { AuthUser } from "../auth/auth-user.decorator";
import { NotificationImportService } from "./notification-import.service";

class IssueDeviceDto {
  @IsUUID() workspaceId!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
}

class DeviceEventDto {
  @IsString() @IsNotEmpty() @MaxLength(255) packageName!: string;
  @IsOptional() @IsString() @MaxLength(100) appName?: string;
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) text!: string;
  @IsDateString() postedAt!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) notificationKey!: string;
}

class AcceptDto {
  @IsUUID() workspaceId!: string;
  @IsString() @IsNotEmpty() @MaxLength(50) category!: string;
  @IsOptional() @IsUUID() paymentMethodId?: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
}

@Controller("notification-imports")
export class NotificationImportController {
  constructor(private readonly imports: NotificationImportService) {}

  @Post("events")
  ingest(@Headers("authorization") authorization: string | undefined, @Body() dto: DeviceEventDto) {
    return this.imports.ingest(authorization?.replace(/^Bearer\s+/i, ""), dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("devices")
  issueDevice(@AuthUser() user: { id: string }, @Body() dto: IssueDeviceDto) {
    return this.imports.issueDevice(user.id, dto.workspaceId, dto.name);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("devices")
  devices(@AuthUser() user: { id: string }, @Query("workspaceId") workspaceId: string) {
    return this.imports.listDevices(user.id, workspaceId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("devices/:id")
  revokeDevice(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.imports.revokeDevice(user.id, workspaceId, id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get()
  list(@AuthUser() user: { id: string }, @Query("workspaceId") workspaceId: string) {
    return this.imports.listImports(user.id, workspaceId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/accept")
  accept(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: AcceptDto,
  ) {
    return this.imports.accept(user.id, dto.workspaceId, id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/ignore")
  ignore(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body("workspaceId") workspaceId: string,
  ) {
    return this.imports.ignore(user.id, workspaceId, id);
  }
}
