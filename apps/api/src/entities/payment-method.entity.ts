import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum PaymentMethodType { CREDIT_CARD='CREDIT_CARD', CHECK_CARD='CHECK_CARD', BANK_ACCOUNT='BANK_ACCOUNT', CASH='CASH' }
@Entity('payment_methods') export class PaymentMethod {
 @PrimaryGeneratedColumn('uuid') id!: string; @Column({name:'workspace_id',type:'uuid'}) workspaceId!: string; @Column({length:100}) name!: string; @Column({type:'enum',enum:PaymentMethodType}) type!: PaymentMethodType;
 @Column({name:'billing_day',type:'int',nullable:true}) billingDay!: number|null; @Column({name:'target_performance',type:'decimal',precision:15,scale:2,nullable:true,default:0}) targetPerformance!: string|null;
 @Column({name:'card_issuer',type:'varchar',length:100,nullable:true}) cardIssuer!: string|null; @Column({name:'annual_fee',type:'decimal',precision:15,scale:2,nullable:true,default:0}) annualFee!: string|null;
 @Column({name:'external_account_id',type:'varchar',length:255,nullable:true}) externalAccountId!: string|null; @Column({name:'is_auto_synced',default:false}) isAutoSynced!: boolean; @Column({name:'created_at',type:'timestamptz',default:()=> 'NOW()'}) createdAt!: Date;
}
