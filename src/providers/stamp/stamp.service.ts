import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
      const teamId = payload.team_id;
      const emojiName = this.normalizeEmojiName(payload.text);

      this.logger.debug(
        `Making emoji bigger: ${emojiName} for team: ${teamId} in channel: ${channelId}`,
      );

      const token = await this.authService.getBotToken(teamId);
      const webClient = new WebClient(token);

      const emoji = await this.getEmojiURL(webClient, emojiName);
      if (!emoji) {
        this.logger.warn(`Emoji not found: ${emojiName}`);
        throw new NotFoundException(`Emoji "${emojiName}" was not found`);
      }

      await this.createAttachment(webClient, channelId, emoji);
      this.logger.debug(`Successfully posted emoji: ${emojiName}`);
    } catch (error: any) {
      this.logger.error(`Error making emoji bigger: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getEmojiURL(webclient: WebClient, text: string): Promise<string | null> {
    try {
      const emojiAPIResponse = await webclient.emoji.list();
      const emojiList = emojiAPIResponse.emoji as Record<string, string>;
      return this.resolveEmojiUrl(emojiList, text);
    } catch (error: any) {
      this.logger.error(`Error getting emoji URL: ${error.message}`, error.stack);
      throw new BadGatewayException('Failed to fetch emoji list from Slack');
    }
  }

  private async createAttachment(webclient: WebClient, channelId: string, image: string): Promise<void> {
    try {
      await webclient.chat.postMessage({
        channel: channelId,
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

  private normalizeEmojiName(text: string): string {
    const match = text.trim().match(/^:?(?<emoji>[a-z0-9_+-]+):?$/i);
    const emojiName = match?.groups?.emoji;

    if (!emojiName) {
      throw new BadRequestException('A single emoji name is required');
    }

    return emojiName;
  }

  private resolveEmojiUrl(
    emojiList: Record<string, string>,
    emojiName: string,
    visited = new Set<string>(),
  ): string | null {
    if (visited.has(emojiName)) {
      return null;
    }

    visited.add(emojiName);

    const emojiValue = emojiList[emojiName];
    if (!emojiValue) {
      return null;
    }

    if (!emojiValue.startsWith('alias:')) {
      return emojiValue;
    }

    return this.resolveEmojiUrl(emojiList, emojiValue.replace('alias:', ''), visited);
  }
}
