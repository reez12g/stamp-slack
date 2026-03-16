import { Test, TestingModule } from '@nestjs/testing';
import { StampService } from './stamp.service';
import { AuthService } from '../auth/auth.service';
import { StampDTO } from '../../dto/stamp/stamp.dto';
import { WebClient } from '@slack/web-api';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

// Mock @slack/web-api
jest.mock('@slack/web-api');

describe('StampService', () => {
  let stampService: StampService;
  let authService: AuthService;
  let mockWebClient: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StampService,
        {
          provide: AuthService,
          useValue: {
            getBotToken: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    stampService = module.get<StampService>(StampService);
    authService = module.get<AuthService>(AuthService);
    
    // Create a mock WebClient instance
    mockWebClient = {
      emoji: {
        list: jest.fn(),
      },
      chat: {
        postMessage: jest.fn(),
      },
    };
    
    // Reset mocks and setup WebClient constructor mock
    jest.clearAllMocks();
    (WebClient as unknown as jest.Mock).mockImplementation(() => mockWebClient);
  });

  describe('makeEmojiBigger', () => {
    it('should make emoji bigger successfully', async () => {
      // Arrange
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':smile:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };
      
      const botToken = 'xoxb-bot-token';
      const emojiUrl = 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png';
      
      // Mock auth service to return a token
      jest.spyOn(authService, 'getBotToken').mockResolvedValue(botToken);
      
      // Mock WebClient emoji.list to return emoji data
      mockWebClient.emoji.list.mockResolvedValue({
        ok: true,
        emoji: {
          smile: emojiUrl,
        },
      } as any);
      
      // Mock WebClient chat.postMessage
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
      } as any);

      // Act
      await stampService.makeEmojiBigger(payload);

      // Assert
      expect(authService.getBotToken).toHaveBeenCalledWith('T123456');
      expect(WebClient).toHaveBeenCalledWith(botToken);
      expect(mockWebClient.emoji.list).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C123456',
        text: ':smile:',
        attachments: [
          {
            color: '#FFF',
            text: ':smile:',
            image_url: emojiUrl,
          },
        ],
      });
    });

    it('should resolve aliased emoji', async () => {
      // Arrange
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':party:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };

      const botToken = 'xoxb-bot-token';
      const emojiUrl = 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png';

      // Mock auth service to return a token
      jest.spyOn(authService, 'getBotToken').mockResolvedValue(botToken);

      mockWebClient.emoji.list.mockResolvedValue({
        ok: true,
        emoji: {
          party: 'alias:smile',
          smile: emojiUrl,
        },
      } as any);

      // Act
      await stampService.makeEmojiBigger(payload);

      // Assert
      expect(authService.getBotToken).toHaveBeenCalledWith('T123456');
      expect(WebClient).toHaveBeenCalledWith(botToken);
      expect(mockWebClient.emoji.list).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C123456',
        text: ':party:',
        attachments: [
          {
            color: '#FFF',
            text: ':party:',
            image_url: emojiUrl,
          },
        ],
      });
    });

    it('should throw when emoji is not found', async () => {
      // Arrange
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':nonexistent:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };

      const botToken = 'xoxb-bot-token';

      jest.spyOn(authService, 'getBotToken').mockResolvedValue(botToken);
      mockWebClient.emoji.list.mockResolvedValue({
        ok: true,
        emoji: {
          smile: 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png',
        },
      } as any);

      await expect(stampService.makeEmojiBigger(payload)).rejects.toThrow(NotFoundException);
      expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should throw an error when auth service fails', async () => {
      // Arrange
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':smile:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };
      
      // Mock auth service to throw an error
      jest.spyOn(authService, 'getBotToken').mockRejectedValue(
        new Error('Workspace not installed'),
      );

      // Act & Assert
      await expect(stampService.makeEmojiBigger(payload)).rejects.toThrow(
        'Workspace not installed',
      );
      expect(authService.getBotToken).toHaveBeenCalledWith('T123456');
      expect(WebClient).not.toHaveBeenCalled();
    });

    it('should throw an error when Slack API fails', async () => {
      // Arrange
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':smile:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };
      
      const botToken = 'xoxb-bot-token';
      const emojiUrl = 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png';
      
      // Mock auth service to return a token
      jest.spyOn(authService, 'getBotToken').mockResolvedValue(botToken);
      
      // Mock WebClient emoji.list to return emoji data
      mockWebClient.emoji.list.mockResolvedValue({
        ok: true,
        emoji: {
          smile: emojiUrl,
        },
      } as any);
      
      // Mock WebClient chat.postMessage to throw an error
      mockWebClient.chat.postMessage.mockRejectedValue(new Error('Slack API error'));

      // Act & Assert
      await expect(stampService.makeEmojiBigger(payload)).rejects.toThrow('Slack API error');
      expect(authService.getBotToken).toHaveBeenCalledWith('T123456');
      expect(WebClient).toHaveBeenCalledWith(botToken);
      expect(mockWebClient.emoji.list).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should throw when payload text is not a single emoji name', async () => {
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: 'smile extra',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };

      await expect(stampService.makeEmojiBigger(payload)).rejects.toThrow(BadRequestException);
      expect(authService.getBotToken).not.toHaveBeenCalled();
      expect(WebClient).not.toHaveBeenCalled();
    });

    it('should throw when fetching the emoji list fails', async () => {
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':smile:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };

      jest.spyOn(authService, 'getBotToken').mockResolvedValue('xoxb-bot-token');
      mockWebClient.emoji.list.mockRejectedValue(new Error('emoji.list failed'));

      await expect(stampService.makeEmojiBigger(payload)).rejects.toThrow(BadGatewayException);
      expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should reuse cached emoji metadata for the same team', async () => {
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':smile:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };

      jest.spyOn(authService, 'getBotToken').mockResolvedValue('xoxb-bot-token');
      mockWebClient.emoji.list.mockResolvedValue({
        ok: true,
        emoji: {
          smile: 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png',
        },
      } as any);
      mockWebClient.chat.postMessage.mockResolvedValue({ ok: true } as any);

      await stampService.makeEmojiBigger(payload);
      await stampService.makeEmojiBigger(payload);

      expect(WebClient).toHaveBeenCalledTimes(1);
      expect(mockWebClient.emoji.list).toHaveBeenCalledTimes(1);
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleSlashCommand', () => {
    it('should send an ephemeral failure response when posting fails', async () => {
      const payload: StampDTO = {
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        enterprise_id: 'E123456',
        enterprise_name: 'Test Enterprise',
        channel_id: 'C123456',
        channel_name: 'test-channel',
        user_id: 'U123456',
        user_name: 'test-user',
        command: '/stamp',
        text: ':smile:',
        response_url: 'https://hooks.slack.com/commands/123456',
        trigger_id: 'test-trigger',
      };

      const httpService = (stampService as any).httpService as HttpService;
      jest
        .spyOn(authService, 'getBotToken')
        .mockRejectedValue(new NotFoundException('Slack workspace is not installed'));
      jest.spyOn(httpService, 'post').mockReturnValue(of({ data: { ok: true } } as any));

      await expect(stampService.handleSlashCommand(payload)).resolves.toBeUndefined();
      expect(httpService.post).toHaveBeenCalledWith(payload.response_url, {
        response_type: 'ephemeral',
        text: 'This workspace has not installed Stamp Slack yet. Open the app and click Add to Slack first.',
      });
    });
  });
});
