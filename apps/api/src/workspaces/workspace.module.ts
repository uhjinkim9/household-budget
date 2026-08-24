import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
} from "../entities/workspace.entity";
import { WorkspaceCategory } from "../entities/workspace-category.entity";
import { User } from "../entities/user.entity";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceMembershipService } from "./workspace-membership.service";
import { WorkspaceMembershipController } from "./workspace-membership.controller";
import { WorkspaceAccessService } from "./workspace-access.service";
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      WorkspaceInvite,
      WorkspaceCategory,
      User,
    ]),
  ],
  providers: [
    WorkspaceService,
    WorkspaceMembershipService,
    WorkspaceAccessService,
  ],
  controllers: [WorkspaceController, WorkspaceMembershipController],
  exports: [WorkspaceAccessService],
})
export class WorkspaceModule {}
