import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StampService } from '../../providers/stamp/stamp.service';
import { StampDTO } from '../../dto/stamp/stamp.dto';
import { SlackRequestSignatureGuard } from '../../guards/slack-request-signature.guard';

@Controller('stamp')
export class StampController {
  private readonly logger = new Logger(StampController.name);
  
  constructor(private readonly stampService: StampService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(SlackRequestSignatureGuard)
  stampSlack(@Body() payload: StampDTO) {
    this.logger.log(`Received stamp request for emoji: ${payload.text}`);
    void this.stampService.handleSlashCommand(payload).catch((error: any) => {
      this.logger.error(`Unhandled stamp command error: ${error.message}`, error.stack);
    });
  }
}
