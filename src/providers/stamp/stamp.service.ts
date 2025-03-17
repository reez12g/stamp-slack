import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { WebClient } from '@slack/web-api';
import { StampDTO } from '../../dto/stamp/stamp.dto';

@Injectable()
export class StampService {
  private readonly logger = new Logger(StampService.name);
  
  constructor(private readonly authService: AuthService) {}

  async makeEmojiBigger(payload: StampDTO): Promise<void> {
    try {
      const channelId = payload.channel_id;
      const userId = payload.user_id;
      const text = payload.text.replace(/:([^:]+):/, '$1');

      this.logger.debug(`Making emoji bigger: ${text} for user: ${userId} in channel: ${channelId}`);
      
      const token = await this.authService.getUserToken(userId);
      const webClient = new WebClient(token);
      
      const emoji = await this.getEmojiURL(webClient, text);
      if (emoji) {
        await this.createAttachment(webClient, channelId, emoji);
        this.logger.debug(`Successfully posted emoji: ${text}`);
      } else {
        this.logger.warn(`Emoji not found: ${text}`);
      }
    } catch (error: any) {
      this.logger.error(`Error making emoji bigger: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getEmojiURL(webclient: WebClient, text: string): Promise<string | null> {
    try {
      const emojiAPIResponse = await webclient.emoji.list();
      const emojiList = emojiAPIResponse.emoji as Record<string, string>;
      return emojiList[text] || null;
    } catch (error: any) {
      this.logger.error(`Error getting emoji URL: ${error.message}`, error.stack);
      return null;
    }
  }

  private async createAttachment(webclient: WebClient, channelId: string, image: string): Promise<void> {
    try {
      await webclient.chat.postMessage({
        channel: channelId,
        as_user: true,
        text: '',
        attachments: [
          {
            color: '#FFF',
            text: '',
            image_url: image,
          },
        ],
      });
    } catch (error: any) {
      this.logger.error(`Error creating attachment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
