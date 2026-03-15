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
    expect(page.botScopes).toEqual(['commands']);
    expect(page.userScopes).toEqual(['chat:write', 'emoji:read']);
  });

  it('should build install urls and scopes from environment variables', () => {
    process.env.APP_BASE_URL = 'https://stamp.example.com/';
    process.env.SLACK_CLIENT_ID = '123456';
    process.env.SLACK_CLIENT_SECRET = 'secret';
    process.env.SLACK_BOT_SCOPES = 'commands,app_mentions:read';
    process.env.SLACK_USER_SCOPES = 'chat:write,emoji:read';
    process.env.AUTH_SUCCESS_REDIRECT_URL = 'https://stamp.example.com/ready';

    const appService = new AppService();
    const page = appService.getLandingPage(true);

    expect(page.connected).toBe(true);
    expect(page.needsPublicBaseUrl).toBe(false);
    expect(page.authSuccessRedirectUrl).toBe('https://stamp.example.com/ready');
    expect(page.addToSlackUrl).toContain('client_id=123456');
    expect(page.addToSlackUrl).toContain('redirect_uri=https%3A%2F%2Fstamp.example.com%2Fauth');
    expect(page.botScopes).toEqual(['commands', 'app_mentions:read']);
  });
});
