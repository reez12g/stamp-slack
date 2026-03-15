import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/controllers/app.controller';
import { AppService } from '../src/providers/app.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const mockAppService = {
      getLandingPage: jest.fn().mockReturnValue({
        title: 'Stamp Slack',
        connected: false,
        addToSlackUrl: 'https://slack.com/oauth/v2/authorize?client_id=test',
        appBaseUrl: 'https://example.test',
        oauthRedirectUrl: 'https://example.test/auth',
        slashCommandUrl: 'https://example.test/stamp',
        authSuccessRedirectUrl: 'https://example.test/?connected=1',
        botScopes: ['commands'],
        userScopes: ['chat:write', 'emoji:read'],
        botScopesText: 'commands',
        userScopesText: 'chat:write, emoji:read',
        setupChecklist: [],
        needsPublicBaseUrl: false,
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setBaseViewsDir(join(process.cwd(), 'src/views'));
    app.setViewEngine('hbs');
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        expect(response.text).toContain('Stamp Slack');
        expect(response.text).toContain('/stamp');
        expect(response.text).toContain('Add to Slack');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
