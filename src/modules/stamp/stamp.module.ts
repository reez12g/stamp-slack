import { Module } from '@nestjs/common';
import { StampController } from '../../controllers/stamp/stamp.controller';
import { StampService } from '../../providers/stamp/stamp.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  exports: [StampService],
  controllers: [StampController],
  providers: [StampService],
})
export class StampModule {}
