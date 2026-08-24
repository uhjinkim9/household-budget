import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkspaceMember, WorkspaceRole } from "../entities/workspace.entity";

@Injectable()
export class WorkspaceAccessService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly members: Repository<WorkspaceMember>,
  ) {}

  async assertViewer(userId: string, workspaceId: string) {
    const member = await this.members.findOneBy({ userId, workspaceId });
    if (!member)
      throw new ForbiddenException("이 가계에 접근할 권한이 없습니다.");
    return member;
  }

  async assertEditor(userId: string, workspaceId: string) {
    const member = await this.assertViewer(userId, workspaceId);
    if (member.role === WorkspaceRole.VIEWER)
      throw new ForbiddenException("조회자는 내역을 변경할 수 없습니다.");
    return member;
  }

  async assertOwner(userId: string, workspaceId: string) {
    const member = await this.assertViewer(userId, workspaceId);
    if (member.role !== WorkspaceRole.OWNER)
      throw new ForbiddenException("가계 소유자만 관리할 수 있습니다.");
    return member;
  }
}
