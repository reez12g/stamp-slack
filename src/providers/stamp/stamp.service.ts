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
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

type EmojiCacheEntry = {
  emojiList: Record<string, string>;
  expiresAt: number;
};

type WebClientCacheEntry = {
  client: WebClient;
  token: string;
};

@Injectable()
export class StampService {
  private readonly logger = new Logger(StampService.name);
  private readonly emojiCache = new Map<string, EmojiCacheEntry>();
  private readonly webClientCache = new Map<string, WebClientCacheEntry>();

  constructor(
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
  ) {}

  async handleSlashCommand(payload: StampDTO): Promise<void> {
    try {
      await this.makeEmojiBigger(payload);
    } catch (error: any) {
      this.logger.error(`Error handling slash command: ${error.message}`, error.stack);
      await this.sendFailureResponse(payload.response_url, this.getFailureMessage(error));
    }
  }

  async makeEmojiBigger(payload: StampDTO): Promise<void> {
    try {
      const channelId = payload.channel_id;
      const teamId = payload.team_id;
      const emojiName = this.normalizeEmojiName(payload.text);

      this.logger.debug(
        `Making emoji bigger: ${emojiName} for team: ${teamId} in channel: ${channelId}`,
      );

      const webClient = await this.getWebClient(teamId);

      const emoji = await this.getEmojiURL(teamId, webClient, emojiName);
      if (!emoji) {
        this.logger.warn(`Emoji not found: ${emojiName}`);
        throw new NotFoundException(`Emoji "${emojiName}" was not found`);
      }

      await this.createAttachment(webClient, channelId, emojiName, emoji);
      this.logger.debug(`Successfully posted emoji: ${emojiName}`);
    } catch (error: any) {
      this.logger.error(`Error making emoji bigger: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getEmojiURL(
    teamId: string,
    webclient: WebClient,
    text: string,
  ): Promise<string | null> {
    try {
      const emojiList = await this.getEmojiList(teamId, webclient);
      return this.resolveEmojiUrl(emojiList, text);
    } catch (error: any) {
      this.logger.error(`Error getting emoji URL: ${error.message}`, error.stack);
      throw new BadGatewayException('Failed to fetch emoji list from Slack');
    }
  }

  private async getEmojiList(
    teamId: string,
    webclient: WebClient,
  ): Promise<Record<string, string>> {
    const cachedEmojiList = this.emojiCache.get(teamId);
    if (cachedEmojiList && cachedEmojiList.expiresAt > Date.now()) {
      return cachedEmojiList.emojiList;
    }

    const emojiAPIResponse = await webclient.emoji.list();
    const emojiList = (emojiAPIResponse.emoji ?? {}) as Record<string, string>;

    this.emojiCache.set(teamId, {
      emojiList,
      expiresAt: Date.now() + this.getEmojiCacheTtlMs(),
    });

    return emojiList;
  }

  private async getWebClient(teamId: string): Promise<WebClient> {
    const token = await this.authService.getBotToken(teamId);
    const cachedClient = this.webClientCache.get(teamId);

    if (cachedClient?.token === token) {
      return cachedClient.client;
    }

    const webClient = new WebClient(token);
    this.webClientCache.set(teamId, { client: webClient, token });

    return webClient;
  }

  private async createAttachment(
    webclient: WebClient,
    channelId: string,
    emojiName: string,
    image: string,
  ): Promise<void> {
    try {
      await webclient.chat.postMessage({
        channel: channelId,
        text: `:${emojiName}:`,
        attachments: [
          {
            color: '#FFF',
            text: `:${emojiName}:`,
            image_url: image,
          },
        ],
      });
    } catch (error: any) {
      this.logger.error(`Error creating attachment: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getEmojiCacheTtlMs(): number {
    const configuredTtl = Number(process.env.EMOJI_CACHE_TTL_MS ?? 300000);

    if (!Number.isFinite(configuredTtl) || configuredTtl <= 0) {
      return 300000;
    }

    return configuredTtl;
  }

  private async sendFailureResponse(responseUrl: string, text: string): Promise<void> {
    try {
      await lastValueFrom(
        this.httpService.post(responseUrl, {
          response_type: 'ephemeral',
          text,
        }),
      );
    } catch (error: any) {
      this.logger.warn(`Failed to post slash command error response: ${error.message}`);
    }
  }

  private getFailureMessage(error: Error): string {
    if (error instanceof BadRequestException) {
      return 'Use /stamp followed by a single custom emoji name, for example /stamp :thumbsup:.';
    }

    if (error instanceof NotFoundException) {
      if (error.message === 'Slack workspace is not installed') {
        return 'This workspace has not installed Stamp Slack yet. Open the app and click Add to Slack first.';
      }

      return 'That emoji was not found in this Slack workspace.';
    }

    if (error instanceof BadGatewayException) {
      return 'Slack did not respond in time. Please try again in a moment.';
    }

    return 'Stamp Slack could not post that emoji right now.';
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
