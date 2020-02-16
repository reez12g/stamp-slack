import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class StampService {
  constructor(private readonly authService: AuthService) {}

  async makeEmojiBigger(payload) {
    const channelId = payload.channel_id;
    const userId = payload.user_id;
    const text = payload.text.replace(/:([^:]+):/, '$1');

    const { WebClient } = require('@slack/web-api');

    async function getEmojiURL(webclient, text) {
      const emojiAPIResponse = await webclient.emoji.list();
      const emojiList = emojiAPIResponse.emoji;
      try {
        return emojiList[text];
      } catch (e) {
        console.log(
          `${text} is missing or an error has occurred. please try again :pray:`,
        );
      }
    }

    function createAttachment(webclient, channelId, image) {
      webclient.chat.postMessage({
        channel: channelId,
        // eslint-disable-next-line @typescript-eslint/camelcase
        as_user: true,
        text: '',
        attachments: [
          {
            color: '#FFF',
            text: '',
            // eslint-disable-next-line @typescript-eslint/camelcase
            image_url: image,
          },
        ],
      });
    }

    try {
      console.log(userId);
      const token = await this.authService.getUserToken(userId);
      console.log(token);
      const webClient = new WebClient(token);
      const emoji = await getEmojiURL(webClient, text);
      createAttachment(webClient, channelId, emoji);
    } catch (e) {
      console.log(`Error ${e}`);
    }
  }
}
