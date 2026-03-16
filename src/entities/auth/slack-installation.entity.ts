import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'slack_installations' })
export class SlackInstallation {
  @PrimaryColumn({ name: 'team_id' })
  teamId: string;

  @Column({ name: 'team_name', nullable: true })
  teamName?: string | null;

  @Column({ name: 'bot_access_token' })
  botAccessToken: string;

  @Column({ name: 'bot_scopes' })
  botScopes: string;

  @Column({ name: 'bot_user_id', nullable: true })
  botUserId?: string | null;

  @Column({ name: 'app_id', nullable: true })
  appId?: string | null;

  @Column({ name: 'installed_by_user_id', nullable: true })
  installedByUserId?: string | null;

  @Column({ name: 'enterprise_id', nullable: true })
  enterpriseId?: string | null;

  @Column({ name: 'enterprise_name', nullable: true })
  enterpriseName?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
