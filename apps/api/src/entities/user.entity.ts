import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from './base.entity';
export enum AuthProvider { LOCAL='LOCAL', GOOGLE='GOOGLE', KAKAO='KAKAO' }
@Entity('users') export class User extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 255, unique: true }) email!: string;
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false }) passwordHash!: string | null;
  @Column({ length: 100 }) name!: string;
  @Column({ name: 'profile_image_url', type: 'text', nullable: true }) profileImageUrl!: string | null;
  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL }) provider!: AuthProvider;
}
