import {
  Body,
  Controller,
  HttpException,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
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
  async stampSlack(@Body() payload: StampDTO) {
    try {
      this.logger.log(`Received stamp request for emoji: ${payload.text}`);
      await this.stampService.makeEmojiBigger(payload);
      return { success: true, message: 'Emoji posted successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to stamp slack: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to post emoji to Slack');
    }
  }
}
