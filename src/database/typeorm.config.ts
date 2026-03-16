import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { SlackInstallation } from '../entities/auth/slack-installation.entity';

function getSslOption(env: NodeJS.ProcessEnv): false | { rejectUnauthorized: false } {
  return env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

function getMigrationsGlob(): string {
  return join(__dirname, 'migrations', '*.{ts,js}');
}

export function getTypeOrmModuleOptions(
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: false,
    migrationsRun: true,
    logging: false,
    entities: [SlackInstallation],
    migrations: [getMigrationsGlob()],
    ssl: getSslOption(env),
  };
}

export function getDataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return getTypeOrmModuleOptions(env) as DataSourceOptions;
}
