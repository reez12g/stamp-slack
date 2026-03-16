import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StampController } from '../../controllers/stamp/stamp.controller';
import { StampService } from '../../providers/stamp/stamp.service';
import { AuthModule } from '../auth/auth.module';
import { SlackRequestSignatureGuard } from '../../guards/slack-request-signature.guard';

@Module({
  imports: [AuthModule, HttpModule],
  exports: [StampService],
  controllers: [StampController],
  providers: [StampService, SlackRequestSignatureGuard],
})
export class StampModule {}
