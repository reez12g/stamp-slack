import { Module } from '@nestjs/common';
import { AuthController } from '../../controllers/auth/auth.controller';
import { AuthService } from '../../providers/auth/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { User } from '../../entities/auth/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  exports: [TypeOrmModule, AuthService],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
