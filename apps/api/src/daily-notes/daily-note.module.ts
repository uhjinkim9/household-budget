import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DailyNote } from "../entities/daily-note.entity";
import { WorkspaceModule } from "../workspaces/workspace.module";
import { DailyNoteController } from "./daily-note.controller";
import { DailyNoteService } from "./daily-note.service";

@Module({
  imports: [TypeOrmModule.forFeature([DailyNote]), WorkspaceModule],
  controllers: [DailyNoteController],
  providers: [DailyNoteService],
})
export class DailyNoteModule {}
