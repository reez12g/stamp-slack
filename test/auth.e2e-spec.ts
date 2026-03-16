import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AuthController } from '../src/controllers/auth/auth.controller';
import { AuthService } from '../src/providers/auth/auth.service';
import { applyAppConfiguration } from '../src/app.setup';

describe('AuthController (e2e)', () => {
  let app: NestExpressApplication;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      beginInstallation: jest.fn(),
      exchangeTempAuthToken: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>(undefined, {
      bodyParser: false,
    });
    applyAppConfiguration(app);
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();
  });

  it('/auth (GET) - success', async () => {
    const mockResponse = { success: true, redirectUrl: 'https://example.com' };
    jest.spyOn(authService, 'exchangeTempAuthToken').mockResolvedValue(mockResponse);

    return request(app.getHttpServer())
      .get('/auth')
      .set('Cookie', 'slack_oauth_state=test-state-cookie')
      .query({ code: 'test-code', state: 'test-state' })
      .expect(HttpStatus.FOUND)
      .expect('Location', 'https://example.com');
  });

  it('/auth (GET) - json success', async () => {
    const mockResponse = { success: true, redirectUrl: 'https://example.com' };
    jest.spyOn(authService, 'exchangeTempAuthToken').mockResolvedValue(mockResponse);

    return request(app.getHttpServer())
      .get('/auth')
      .set('Cookie', 'slack_oauth_state=test-state-cookie')
      .query({ code: 'test-code', state: 'test-state', format: 'json' })
      .expect(HttpStatus.OK)
      .expect(mockResponse);
  });

  it('/auth (GET) - failure', async () => {
    jest.spyOn(authService, 'exchangeTempAuthToken').mockRejectedValue(new Error('Service error'));

    return request(app.getHttpServer())
      .get('/auth')
      .set('Cookie', 'slack_oauth_state=test-state-cookie')
      .query({ code: 'test-code', state: 'test-state' })
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('/auth (GET) - preserves HttpException status', async () => {
    jest
      .spyOn(authService, 'exchangeTempAuthToken')
      .mockRejectedValue(new HttpException('Already registered', HttpStatus.CONFLICT));

    return request(app.getHttpServer())
      .get('/auth')
      .set('Cookie', 'slack_oauth_state=test-state-cookie')
      .query({ code: 'test-code', state: 'test-state' })
      .expect(HttpStatus.CONFLICT);
  });

  it('/auth/start (GET) - redirects to Slack', async () => {
    jest.spyOn(authService, 'beginInstallation').mockReturnValue({
      redirectUrl: 'https://slack.com/oauth/v2/authorize?client_id=123',
      stateCookieValue: 'state-cookie',
      stateCookieMaxAgeMs: 600000,
      secureCookie: false,
    });

    return request(app.getHttpServer())
      .get('/auth/start')
      .expect(HttpStatus.FOUND)
      .expect('Location', 'https://slack.com/oauth/v2/authorize?client_id=123')
      .expect('Set-Cookie', /slack_oauth_state=state-cookie/);
  });

  it('/auth (GET) - rejects an invalid callback query', async () => {
    return request(app.getHttpServer())
      .get('/auth')
      .query({ code: 'test-code', state: '' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  afterEach(async () => {
    await app.close();
  });
});
