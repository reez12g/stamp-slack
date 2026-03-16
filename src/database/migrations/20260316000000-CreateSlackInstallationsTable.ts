import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSlackInstallationsTable20260316000000 implements MigrationInterface {
  name = 'CreateSlackInstallationsTable20260316000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slack_installations" (
        "team_id" character varying NOT NULL,
        "team_name" character varying,
        "bot_access_token" character varying NOT NULL,
        "bot_scopes" character varying NOT NULL,
        "bot_user_id" character varying,
        "app_id" character varying,
        "installed_by_user_id" character varying,
        "enterprise_id" character varying,
        "enterprise_name" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_slack_installations_team_id" PRIMARY KEY ("team_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "slack_installations"');
  }
}
