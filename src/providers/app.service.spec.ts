import { AppService } from './app.service';

describe('AppService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    delete process.env.SLACK_CLIENT_ID;
    delete process.env.SLACK_CLIENT_SECRET;
    delete process.env.SLACK_BOT_SCOPES;
    delete process.env.SLACK_USER_SCOPES;
    delete process.env.AUTH_SUCCESS_REDIRECT_URL;
    process.env.PORT = '3000';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should expose localhost onboarding defaults when config is incomplete', () => {
    const appService = new AppService();

    const page = appService.getLandingPage();

    expect(page.appBaseUrl).toBe('http://localhost:3000');
    expect(page.addToSlackUrl).toBeNull();
    expect(page.oauthRedirectUrl).toBe('http://localhost:3000/auth');
    expect(page.slashCommandUrl).toBe('http://localhost:3000/stamp');
    expect(page.needsPublicBaseUrl).toBe(true);
    expect(page.botScopes).toEqual(['commands', 'chat:write', 'emoji:read']);
    expect(page.userScopes).toEqual([]);
  });

  it('should build install urls and scopes from environment variables', () => {
    process.env.APP_BASE_URL = 'https://stamp.example.com/';
    process.env.SLACK_CLIENT_ID = '123456';
    process.env.SLACK_CLIENT_SECRET = 'secret';
    process.env.SLACK_BOT_SCOPES = 'commands,chat:write,emoji:read';
    process.env.SLACK_SIGNING_SECRET = 'signing-secret';
    process.env.AUTH_SUCCESS_REDIRECT_URL = 'https://stamp.example.com/ready';

    const appService = new AppService();
    const page = appService.getLandingPage(true);

    expect(page.connected).toBe(true);
    expect(page.needsPublicBaseUrl).toBe(false);
    expect(page.authSuccessRedirectUrl).toBe('https://stamp.example.com/ready');
    expect(page.addToSlackUrl).toBe('https://stamp.example.com/auth/start');
    expect(page.botScopes).toEqual(['commands', 'chat:write', 'emoji:read']);
  });
});
