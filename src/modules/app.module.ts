import { Module } from '@nestjs/common';
import { AppController } from '../controllers/app.controller';
import { AppService } from '../providers/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { StampModule } from './stamp/stamp.module';
import { ConfigModule } from '@nestjs/config';
import { getTypeOrmModuleOptions } from '../database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmModuleOptions(),
    }),
    AuthModule,
    StampModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
