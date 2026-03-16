import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { StampController } from '../src/controllers/stamp/stamp.controller';
import { StampService } from '../src/providers/stamp/stamp.service';
import { StampDTO } from '../src/dto/stamp/stamp.dto';
import { applyAppConfiguration } from '../src/app.setup';
import { createSlackSignature } from '../src/security/slack-request-signature';

describe('StampController (e2e)', () => {
  let app: NestExpressApplication;
  let stampService: StampService;

  function buildSignedRequest(payload: StampDTO) {
    const body = new URLSearchParams(
      Object.entries(payload).map(([key, value]) => [key, value ?? '']),
    ).toString();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createSlackSignature(
      process.env.SLACK_SIGNING_SECRET as string,
      timestamp,
      body,
    );

    return request(app.getHttpServer())
      .post('/stamp')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Slack-Request-Timestamp', timestamp)
      .set('X-Slack-Signature', signature)
      .send(body);
  }

  beforeEach(async () => {
    process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';

    const mockStampService = {
      handleSlashCommand: jest.fn(),
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

    app = moduleFixture.createNestApplication<NestExpressApplication>(undefined, {
      bodyParser: false,
    });
    applyAppConfiguration(app);
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

    jest.spyOn(stampService, 'handleSlashCommand').mockResolvedValue();

    return buildSignedRequest(payload)
      .expect(HttpStatus.OK)
      .expect((response) => {
        expect(response.text).toBe('');
      });
  });

  it('/stamp (POST) - returns immediately even if the background task rejects', async () => {
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

    return buildSignedRequest(payload)
      .expect(HttpStatus.OK);
  });

  it('/stamp (POST) - rejects an invalid Slack signature', async () => {
    const payload = new URLSearchParams({
      team_id: 'T123456',
      team_domain: 'test-team',
      channel_id: 'C123456',
      channel_name: 'test-channel',
      user_id: 'U123456',
      user_name: 'test-user',
      command: '/stamp',
      text: ':smile:',
      response_url: 'https://hooks.slack.com/commands/123456',
      trigger_id: 'test-trigger',
    }).toString();

    return request(app.getHttpServer())
      .post('/stamp')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Slack-Request-Timestamp', String(Math.floor(Date.now() / 1000)))
      .set('X-Slack-Signature', 'v0=invalid')
      .send(payload)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('/stamp (POST) - rejects an invalid payload', async () => {
    const payload = new URLSearchParams({
      team_id: 'T123456',
      team_domain: 'test-team',
      channel_id: 'C123456',
      channel_name: 'test-channel',
      user_id: 'U123456',
      user_name: 'test-user',
      command: '/stamp',
      text: '',
      response_url: 'https://hooks.slack.com/commands/123456',
      trigger_id: 'test-trigger',
    }).toString();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createSlackSignature(
      process.env.SLACK_SIGNING_SECRET as string,
      timestamp,
      payload,
    );

    return request(app.getHttpServer())
      .post('/stamp')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Slack-Request-Timestamp', timestamp)
      .set('X-Slack-Signature', signature)
      .send(payload)
      .expect(HttpStatus.BAD_REQUEST);
  });

  afterEach(async () => {
    await app.close();
  });
});
