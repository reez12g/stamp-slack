import { Test, TestingModule } from '@nestjs/testing';
import { StampController } from './stamp.controller';
import { StampService } from '../../providers/stamp/stamp.service';
import { StampDTO } from '../../dto/stamp/stamp.dto';

describe('StampController', () => {
  let stampController: StampController;
  let stampService: StampService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StampController],
      providers: [
        {
          provide: StampService,
          useValue: {
            handleSlashCommand: jest.fn(),
          },
        },
      ],
    }).compile();

    stampController = module.get<StampController>(StampController);
    stampService = module.get<StampService>(StampService);
  });

  describe('stampSlack', () => {
    it('should hand off slash commands without waiting for Slack work', async () => {
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

      jest.spyOn(stampService, 'handleSlashCommand').mockResolvedValue();

      // Act
      const result = await stampController.stampSlack(payload);

      // Assert
      expect(result).toBeUndefined();
      expect(stampService.handleSlashCommand).toHaveBeenCalledWith(payload);
    });

    it('should still return immediately when the background task rejects', async () => {
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

      jest.spyOn(stampService, 'handleSlashCommand').mockRejectedValue(new Error('Service error'));

      expect(stampController.stampSlack(payload)).toBeUndefined();
      await Promise.resolve();
      expect(stampService.handleSlashCommand).toHaveBeenCalledWith(payload);
    });
  });
});
