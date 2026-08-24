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
  IsDateString,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { AuthUser } from "../auth/auth-user.decorator";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";
import { DailyNoteService } from "./daily-note.service";

class NoteRangeDto {
  @IsUUID() workspaceId!: string;
  @IsDateString({ strict: true }) from!: string;
  @IsDateString({ strict: true }) to!: string;
}

class SaveNoteDto {
  @IsUUID() workspaceId!: string;
  @IsDateString({ strict: true }) date!: string;
  @IsString() @MinLength(1) @MaxLength(500) content!: string;
}

@UseGuards(AuthGuard("jwt"))
@Controller("daily-notes")
export class DailyNoteController {
  constructor(
    private readonly notes: DailyNoteService,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get()
  async list(@AuthUser() user: { id: string }, @Query() query: NoteRangeDto) {
    await this.access.assertEditor(user.id, query.workspaceId);
    return this.notes.list(query.workspaceId, query.from, query.to);
  }

  @Post()
  async create(@AuthUser() user: { id: string }, @Body() dto: SaveNoteDto) {
    await this.access.assertEditor(user.id, dto.workspaceId);
    return this.notes.create(dto.workspaceId, dto.date, dto.content, user.id);
  }

  @Patch(":id")
  async update(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: SaveNoteDto,
  ) {
    await this.access.assertEditor(user.id, dto.workspaceId);
    return this.notes.update(id, dto.workspaceId, dto.date, dto.content);
  }

  @Delete(":id")
  async remove(
    @AuthUser() user: { id: string },
    @Param("id") id: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    await this.access.assertEditor(user.id, workspaceId);
    return this.notes.remove(id, workspaceId);
  }
}
