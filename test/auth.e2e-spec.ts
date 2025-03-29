import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/controllers/auth/auth.controller';
import { AuthService } from '../src/providers/auth/auth.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
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

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();
  });

  it('/auth (GET) - success', async () => {
    const mockResponse = { success: true, redirectUrl: 'https://example.com' };
    jest.spyOn(authService, 'exchangeTempAuthToken').mockResolvedValue(mockResponse);

    return request(app.getHttpServer())
      .get('/auth')
      .query({ code: 'test-code', state: 'test-state' })
      .expect(HttpStatus.OK)
      .expect(mockResponse);
  });

  it('/auth (GET) - failure', async () => {
    jest.spyOn(authService, 'exchangeTempAuthToken').mockRejectedValue(new Error('Service error'));

    return request(app.getHttpServer())
      .get('/auth')
      .query({ code: 'test-code', state: 'test-state' })
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  afterEach(async () => {
    await app.close();
  });
});
