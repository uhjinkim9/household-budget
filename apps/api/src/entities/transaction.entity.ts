import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'; import { TimestampEntity } from './base.entity';
export enum TransactionType { FIXED='FIXED', VARIABLE='VARIABLE', BALANCE='BALANCE' }
export enum ApprovalStatus { APPROVED='APPROVED', CANCELLED='CANCELLED' }
@Entity('transactions') export class Transaction extends TimestampEntity {
 @PrimaryGeneratedColumn('uuid') id!: string; @Index() @Column({name:'workspace_id',type:'uuid'}) workspaceId!: string; @Column({name:'payment_method_id',type:'uuid',nullable:true}) paymentMethodId!: string|null;
 @Column({type:'enum',enum:TransactionType}) type!: TransactionType; @Column({type:'decimal',precision:15,scale:2}) amount!: string; @Column({length:255}) title!: string; @Column({length:50}) category!: string;
 @Index() @Column({type:'date'}) date!: string; @Column({name:'recurrence_rule',type:'varchar',length:100,nullable:true}) recurrenceRule!: string|null; @Column({name:'is_performance_excluded',default:false}) isPerformanceExcluded!: boolean;
 @Column({name:'external_transaction_id',type:'varchar',length:255,nullable:true,unique:true}) externalTransactionId!: string|null; @Column({name:'approval_status',type:'enum',enum:ApprovalStatus,default:ApprovalStatus.APPROVED}) approvalStatus!: ApprovalStatus;
 @Column({name:'raw_data',type:'jsonb',nullable:true}) rawData!: Record<string,unknown>|null;
}
