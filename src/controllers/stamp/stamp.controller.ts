import { Body, Controller, Post, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { StampService } from '../../providers/stamp/stamp.service';
import { StampDTO } from '../../dto/stamp/stamp.dto';

@Controller('stamp')
export class StampController {
  private readonly logger = new Logger(StampController.name);
  
  constructor(private readonly stampService: StampService) {}

  @Post()
  async stampSlack(@Body() payload: StampDTO) {
    try {
      this.logger.log(`Received stamp request for emoji: ${payload.text}`);
      await this.stampService.makeEmojiBigger(payload);
      return { success: true, message: 'Emoji posted successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to stamp slack: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to post emoji to Slack',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
