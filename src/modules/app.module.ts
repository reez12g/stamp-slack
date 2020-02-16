import { Module } from '@nestjs/common';
import { AppController } from '../controllers/app.controller';
import { AppService } from '../providers/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/auth/user.entity';
import { AuthModule } from './auth/auth.module';
import { StampModule } from './stamp/stamp.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: true,
      logging: false,
      entities: [User],
    }),
    AuthModule,
    StampModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
