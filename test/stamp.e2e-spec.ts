import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { StampController } from '../src/controllers/stamp/stamp.controller';
import { StampService } from '../src/providers/stamp/stamp.service';
import { StampDTO } from '../src/dto/stamp/stamp.dto';

describe('StampController (e2e)', () => {
  let app: INestApplication;
  let stampService: StampService;

  beforeEach(async () => {
    const mockStampService = {
      makeEmojiBigger: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StampController],
      providers: [
        {
          provide: StampService,
          useValue: mockStampService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    stampService = moduleFixture.get<StampService>(StampService);
    await app.init();
  });

  it('/stamp (POST) - success', async () => {
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

    jest.spyOn(stampService, 'makeEmojiBigger').mockResolvedValue();

    return request(app.getHttpServer())
      .post('/stamp')
      .send(payload)
      .expect(HttpStatus.CREATED)
      .expect({ success: true, message: 'Emoji posted successfully' });
  });

  it('/stamp (POST) - failure', async () => {
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

    jest.spyOn(stampService, 'makeEmojiBigger').mockRejectedValue(new Error('Service error'));

    return request(app.getHttpServer())
      .post('/stamp')
      .send(payload)
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  afterEach(async () => {
    await app.close();
  });
});
