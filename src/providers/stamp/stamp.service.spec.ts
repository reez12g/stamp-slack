import { Test, TestingModule } from '@nestjs/testing';
import { StampService } from './stamp.service';
import { AuthService } from '../auth/auth.service';
import { StampDTO } from '../../dto/stamp/stamp.dto';
import { WebClient } from '@slack/web-api';

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
            getUserToken: jest.fn(),
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
      
      const userToken = 'xoxp-user-token';
      const emojiUrl = 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png';
      
      // Mock auth service to return a token
      jest.spyOn(authService, 'getUserToken').mockResolvedValue(userToken);
      
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
      expect(authService.getUserToken).toHaveBeenCalledWith('U123456');
      expect(WebClient).toHaveBeenCalledWith(userToken);
      expect(mockWebClient.emoji.list).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C123456',
        as_user: true,
        text: '',
        attachments: [
          {
            color: '#FFF',
            text: '',
            image_url: emojiUrl,
          },
        ],
      });
    });

    it('should handle emoji not found', async () => {
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
      
      const userToken = 'xoxp-user-token';
      
      // Mock auth service to return a token
      jest.spyOn(authService, 'getUserToken').mockResolvedValue(userToken);
      
      // Mock WebClient emoji.list to return emoji data without the requested emoji
      mockWebClient.emoji.list.mockResolvedValue({
        ok: true,
        emoji: {
          smile: 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png',
        },
      } as any);

      // Act
      await stampService.makeEmojiBigger(payload);

      // Assert
      expect(authService.getUserToken).toHaveBeenCalledWith('U123456');
      expect(WebClient).toHaveBeenCalledWith(userToken);
      expect(mockWebClient.emoji.list).toHaveBeenCalled();
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
      jest.spyOn(authService, 'getUserToken').mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(stampService.makeEmojiBigger(payload)).rejects.toThrow('User not found');
      expect(authService.getUserToken).toHaveBeenCalledWith('U123456');
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
      
      const userToken = 'xoxp-user-token';
      const emojiUrl = 'https://emoji.slack-edge.com/T123456/smile/abcdef123456.png';
      
      // Mock auth service to return a token
      jest.spyOn(authService, 'getUserToken').mockResolvedValue(userToken);
      
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
      expect(authService.getUserToken).toHaveBeenCalledWith('U123456');
      expect(WebClient).toHaveBeenCalledWith(userToken);
      expect(mockWebClient.emoji.list).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });
  });
});
