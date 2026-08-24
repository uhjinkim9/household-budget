import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { randomBytes } from "crypto";
import {
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
} from "../entities/workspace.entity";
import { WorkspaceCategory } from "../entities/workspace-category.entity";
const DEFAULT_CATEGORIES = [
  ["식비", "#e49758"],
  ["교통", "#607cb2"],
  ["주거", "#8a6bb1"],
  ["생활", "#43836a"],
  ["구독", "#d6a32f"],
  ["기타", "#8b948e"],
];
@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace) private w: Repository<Workspace>,
    @InjectRepository(WorkspaceMember) private m: Repository<WorkspaceMember>,
    @InjectRepository(WorkspaceInvite) private i: Repository<WorkspaceInvite>,
    @InjectRepository(WorkspaceCategory)
    private c: Repository<WorkspaceCategory>,
    private db: DataSource,
  ) {}
  async list(userId: string) {
    return this.w
      .createQueryBuilder("w")
      .innerJoin(
        WorkspaceMember,
        "m",
        "m.workspace_id=w.id AND m.user_id=:userId",
        { userId },
      )
      .select([
        "w.id AS id",
        "w.name AS name",
        'w.created_by AS "createdBy"',
        'w.created_at AS "createdAt"',
        "m.role AS role",
      ])
      .orderBy("w.created_at", "ASC")
      .getRawMany();
  }
  async create(userId: string, name: string) {
    return this.db.transaction(async (em) => {
      const w = await em.save(
        Workspace,
        em.create(Workspace, { name, createdBy: userId }),
      );
      await em.save(
        WorkspaceMember,
        em.create(WorkspaceMember, {
          workspaceId: w.id,
          userId,
          role: WorkspaceRole.OWNER,
        }),
      );
      await em.save(
        WorkspaceCategory,
        DEFAULT_CATEGORIES.map(([category, color], index) =>
          em.create(WorkspaceCategory, {
            workspaceId: w.id,
            name: category,
            color,
            sortOrder: index,
          }),
        ),
      );
      return { ...w, role: WorkspaceRole.OWNER };
    });
  }
  async settings(userId: string, id: string) {
    await this.assertOwner(userId, id);
    const workspace = await this.w.findOneBy({ id });
    if (!workspace) throw new NotFoundException();
    const members = await this.m
      .createQueryBuilder("m")
      .innerJoin("users", "u", "u.id=m.user_id")
      .where("m.workspace_id=:id", { id })
      .select([
        "m.id AS id",
        'm.user_id AS "userId"',
        "m.role AS role",
        'm.joined_at AS "joinedAt"',
        "u.name AS name",
        "u.email AS email",
        'u.profile_image_url AS "profileImageUrl"',
      ])
      .orderBy("m.joined_at", "ASC")
      .getRawMany();
    const categories = await this.c.find({
      where: { workspaceId: id },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
    return { workspace, members, categories };
  }
  async update(userId: string, id: string, name: string) {
    await this.assertOwner(userId, id);
    const workspace = await this.w.findOneBy({ id });
    if (!workspace) throw new NotFoundException();
    workspace.name = name.trim();
    return this.w.save(workspace);
  }
  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.db.transaction(async (em) => {
      await em.delete(WorkspaceCategory, { workspaceId: id });
      await em.delete(WorkspaceInvite, { workspaceId: id });
      await em.delete(WorkspaceMember, { workspaceId: id });
      await em.delete(Workspace, { id });
    });
    return { id };
  }
  async removeMember(userId: string, workspaceId: string, memberId: string) {
    await this.assertOwner(userId, workspaceId);
    const target = await this.m.findOneBy({ id: memberId, workspaceId });
    if (!target) throw new NotFoundException();
    if (target.role === WorkspaceRole.OWNER)
      throw new BadRequestException("가계 소유자는 삭제할 수 없습니다.");
    await this.m.remove(target);
    return { id: memberId };
  }
  async updateMemberRole(
    userId: string,
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole,
  ) {
    await this.assertOwner(userId, workspaceId);
    const target = await this.m.findOneBy({ id: memberId, workspaceId });
    if (!target) throw new NotFoundException();
    if (target.role === WorkspaceRole.OWNER)
      throw new BadRequestException("가계 소유자의 권한은 변경할 수 없습니다.");
    if (![WorkspaceRole.MEMBER, WorkspaceRole.VIEWER].includes(role))
      throw new BadRequestException(
        "구성원 또는 조회자 권한만 지정할 수 있습니다.",
      );
    target.role = role;
    return this.m.save(target);
  }
  async addCategory(
    userId: string,
    workspaceId: string,
    name: string,
    color: string,
  ) {
    await this.assertOwner(userId, workspaceId);
    const count = await this.c.countBy({ workspaceId });
    return this.c.save(
      this.c.create({
        workspaceId,
        name: name.trim(),
        color,
        sortOrder: count,
      }),
    );
  }
  async updateCategory(
    userId: string,
    workspaceId: string,
    id: string,
    data: { name?: string; color?: string; isActive?: boolean },
  ) {
    await this.assertOwner(userId, workspaceId);
    const category = await this.c.findOneBy({ id, workspaceId });
    if (!category) throw new NotFoundException();
    if (data.name !== undefined) category.name = data.name.trim();
    if (data.color !== undefined) category.color = data.color;
    if (data.isActive !== undefined) category.isActive = data.isActive;
    return this.c.save(category);
  }
  async removeCategory(userId: string, workspaceId: string, id: string) {
    await this.assertOwner(userId, workspaceId);
    const category = await this.c.findOneBy({ id, workspaceId });
    if (!category) throw new NotFoundException();
    await this.c.remove(category);
    return { id };
  }
  async invite(userId: string, workspaceId: string) {
    await this.assertOwner(userId, workspaceId);
    return this.i.save(
      this.i.create({
        workspaceId,
        createdBy: userId,
        inviteCode: randomBytes(5).toString("hex").toUpperCase(),
      }),
    );
  }
  async listInvites(userId: string, workspaceId: string) {
    await this.assertOwner(userId, workspaceId);
    return this.i.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }
  async revokeInvite(userId: string, workspaceId: string, inviteId: string) {
    await this.assertOwner(userId, workspaceId);
    const invite = await this.i.findOneBy({ id: inviteId, workspaceId });
    if (!invite) throw new NotFoundException();
    invite.isActive = false;
    await this.i.save(invite);
    return { id: inviteId };
  }
  async join(userId: string, code: string) {
    const invite = await this.i.findOneBy({
      inviteCode: code.trim().toUpperCase(),
      isActive: true,
    });
    if (
      !invite ||
      (invite.expiresAt && invite.expiresAt < new Date()) ||
      (invite.maxUses !== null && invite.usedCount >= invite.maxUses)
    )
      throw new BadRequestException("유효하지 않은 초대 코드입니다.");
    await this.m.upsert(
      { workspaceId: invite.workspaceId, userId, role: WorkspaceRole.MEMBER },
      ["workspaceId", "userId"],
    );
    invite.usedCount++;
    await this.i.save(invite);
    return this.w.findOneByOrFail({ id: invite.workspaceId });
  }
  private async assertMember(userId: string, workspaceId: string) {
    if (!(await this.m.findOneBy({ userId, workspaceId })))
      throw new NotFoundException();
  }
  private async assertOwner(userId: string, workspaceId: string) {
    const member = await this.m.findOneBy({ userId, workspaceId });
    if (!member || member.role !== WorkspaceRole.OWNER)
      throw new BadRequestException("가계 소유자만 변경할 수 있습니다.");
  }
}
