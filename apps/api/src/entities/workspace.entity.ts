import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { TimestampEntity } from './base.entity'; import { User } from './user.entity';
@Entity('workspaces') export class Workspace extends TimestampEntity {
 @PrimaryGeneratedColumn('uuid') id!: string; @Column({length:100}) name!: string;
 @Column({name:'created_by',type:'uuid'}) createdBy!: string; @ManyToOne(()=>User) @JoinColumn({name:'created_by'}) creator!: User;
}
export enum WorkspaceRole { OWNER='OWNER', MEMBER='MEMBER', VIEWER='VIEWER' }
@Entity('workspace_members') @Index(['workspaceId','userId'],{unique:true}) export class WorkspaceMember {
 @PrimaryGeneratedColumn('uuid') id!: string; @Column({name:'workspace_id',type:'uuid'}) workspaceId!: string; @Column({name:'user_id',type:'uuid'}) userId!: string;
 @Column({type:'enum',enum:WorkspaceRole,default:WorkspaceRole.MEMBER}) role!: WorkspaceRole; @Column({name:'joined_at',type:'timestamptz',default:()=> 'NOW()'}) joinedAt!: Date;
}
@Entity('workspace_invites') export class WorkspaceInvite {
 @PrimaryGeneratedColumn('uuid') id!: string; @Column({name:'workspace_id',type:'uuid'}) workspaceId!: string; @Column({name:'invite_code',length:20,unique:true}) inviteCode!: string;
 @Column({name:'created_by',type:'uuid'}) createdBy!: string; @Column({name:'expires_at',type:'timestamptz',nullable:true}) expiresAt!: Date|null; @Column({name:'max_uses',type:'int',nullable:true}) maxUses!: number|null;
 @Column({name:'used_count',type:'int',default:0}) usedCount!: number; @Column({name:'is_active',default:true}) isActive!: boolean; @Column({name:'created_at',type:'timestamptz',default:()=> 'NOW()'}) createdAt!: Date;
}
