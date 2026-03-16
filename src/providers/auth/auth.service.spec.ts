import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { SlackInstallation } from '../../entities/auth/slack-installation.entity';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { OauthAccessDto } from '../../dto/auth/auth.access.dto';
import { AxiosResponse } from 'axios';
import {
  BadGatewayException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { encryptToken } from '../../security/token-crypto';

describe('AuthService', () => {
  let authService: AuthService;
  let installationRepository: Repository<SlackInstallation>;
  let httpService: HttpService;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(SlackInstallation),
          useValue: {
            findOne: jest.fn(),
            upsert: jest.fn(),
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

    authService = module.get<AuthService>(AuthService);
    installationRepository = module.get<Repository<SlackInstallation>>(
      getRepositoryToken(SlackInstallation),
    );
    httpService = module.get<HttpService>(HttpService);

    process.env = {
      ...originalEnv,
      APP_BASE_URL: 'http://localhost:3000',
      AUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3000/?connected=1',
      PORT: '3000',
      SLACK_CLIENT_ID: 'test-client-id',
      SLACK_CLIENT_SECRET: 'test-client-secret',
      SLACK_SIGNING_SECRET: 'test-signing-secret',
      TOKEN_ENCRYPTION_SECRET: 'test-token-encryption-secret',
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  describe('beginInstallation', () => {
    it('should build the Slack install redirect and state cookie', () => {
      const result = authService.beginInstallation();
      const redirectUrl = new URL(result.redirectUrl);

      expect(redirectUrl.origin).toBe('https://slack.com');
      expect(redirectUrl.searchParams.get('client_id')).toBe('test-client-id');
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth');
      expect(redirectUrl.searchParams.get('scope')).toBe('commands,chat:write,emoji:read');
      expect(redirectUrl.searchParams.get('state')).toBeTruthy();
      expect(result.stateCookieValue).toBeTruthy();
      expect(result.stateCookieMaxAgeMs).toBe(600000);
      expect(result.secureCookie).toBe(false);
    });

    it('should throw when Slack OAuth is not configured', () => {
      delete process.env.SLACK_CLIENT_ID;

      expect(() => authService.beginInstallation()).toThrow(InternalServerErrorException);
    });
  });

  describe('exchangeTempAuthToken', () => {
    function buildValidState() {
      const install = authService.beginInstallation();
      const state = new URL(install.redirectUrl).searchParams.get('state');

      return {
        state: state as string,
        cookie: install.stateCookieValue,
      };
    }

    it('should exchange a temporary auth token and upsert the workspace install', async () => {
      const { state, cookie } = buildValidState();
      const mockOauthResponse: AxiosResponse = {
        data: {
          ok: true,
          access_token: 'xoxb-bot-token',
          token_type: 'Bearer',
          scope: 'commands,chat:write,emoji:read',
          bot_user_id: 'B123456',
          app_id: 'A123456',
          team: { name: 'Test Team', id: 'T123456' },
          enterprise: { name: 'Test Enterprise', id: 'E123456' },
          authed_user: {
            id: 'U123456',
            scope: '',
            token_type: 'Bearer',
          },
        } as OauthAccessDto,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockOauthResponse));
      jest.spyOn(installationRepository, 'upsert').mockResolvedValue(undefined as never);

      const result = await authService.exchangeTempAuthToken(
        { code: 'test-code', state },
        cookie,
      );

      expect(httpService.post).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.stringContaining('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth'),
        expect.any(Object),
      );
      expect(installationRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'T123456',
          teamName: 'Test Team',
          botScopes: 'commands,chat:write,emoji:read',
          botUserId: 'B123456',
          installedByUserId: 'U123456',
          enterpriseId: 'E123456',
          enterpriseName: 'Test Enterprise',
        }),
        ['teamId'],
      );
      expect(result).toEqual({
        success: true,
        redirectUrl: 'http://localhost:3000/?connected=1',
      });
    });

    it('should throw when code is missing', async () => {
      const { state, cookie } = buildValidState();

      await expect(authService.exchangeTempAuthToken({ code: '', state }, cookie)).rejects.toThrow(
        BadRequestException,
      );
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should throw when state is invalid', async () => {
      await expect(
        authService.exchangeTempAuthToken({ code: 'test-code', state: 'bad-state' }, 'bad-cookie'),
      ).rejects.toThrow(UnauthorizedException);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should throw when Slack OAuth is not configured', async () => {
      const { state, cookie } = buildValidState();
      delete process.env.SLACK_CLIENT_ID;
      delete process.env.SLACK_CLIENT_SECRET;

      await expect(
        authService.exchangeTempAuthToken({ code: 'test-code', state }, cookie),
      ).rejects.toThrow(InternalServerErrorException);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should throw when Slack rejects the OAuth request', async () => {
      const { state, cookie } = buildValidState();
      const mockOauthResponse: AxiosResponse = {
        data: {
          ok: false,
          error: 'invalid_code',
        } as OauthAccessDto,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockOauthResponse));

      await expect(
        authService.exchangeTempAuthToken({ code: 'test-code', state }, cookie),
      ).rejects.toThrow(BadGatewayException);
      expect(installationRepository.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getBotToken', () => {
    it('should return the decrypted bot token when the workspace exists', async () => {
      jest.spyOn(installationRepository, 'findOne').mockResolvedValue({
        teamId: 'T123456',
        teamName: 'Test Team',
        botAccessToken: encryptToken(
          'xoxb-bot-token',
          process.env.TOKEN_ENCRYPTION_SECRET as string,
        ),
        botScopes: 'commands,chat:write,emoji:read',
      } as SlackInstallation);

      await expect(authService.getBotToken('T123456')).resolves.toBe('xoxb-bot-token');
      expect(installationRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'T123456' },
      });
    });

    it('should throw when the workspace is not installed', async () => {
      jest.spyOn(installationRepository, 'findOne').mockResolvedValue(null);

      await expect(authService.getBotToken('T123456')).rejects.toThrow(NotFoundException);
    });
  });
});
