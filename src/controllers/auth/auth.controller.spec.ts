import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../providers/auth/auth.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';
import { Response } from 'express';
import { SLACK_OAUTH_STATE_COOKIE_NAME } from '../../security/oauth-state';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let response: Pick<Response, 'clearCookie' | 'cookie' | 'redirect'>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            beginInstallation: jest.fn(),
            exchangeTempAuthToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    response = {
      clearCookie: jest.fn(),
      cookie: jest.fn(),
      redirect: jest.fn(),
    };
  });

  describe('startSlackInstall', () => {
    it('should set the state cookie and redirect to Slack', () => {
      jest.spyOn(authService, 'beginInstallation').mockReturnValue({
        redirectUrl: 'https://slack.com/oauth/v2/authorize?client_id=123',
        stateCookieValue: 'state-cookie',
        stateCookieMaxAgeMs: 600000,
        secureCookie: false,
      });

      authController.startSlackInstall(response as Response);

      expect(response.cookie).toHaveBeenCalledWith(SLACK_OAUTH_STATE_COOKIE_NAME, 'state-cookie', {
        httpOnly: true,
        maxAge: 600000,
        path: '/auth',
        sameSite: 'lax',
        secure: false,
      });
      expect(response.redirect).toHaveBeenCalledWith(
        'https://slack.com/oauth/v2/authorize?client_id=123',
      );
    });
  });

  describe('exchangeTempAuthToken', () => {
    it('should redirect after exchanging temporary auth token successfully', async () => {
      // Arrange
      const query: TempAuthTokenDTO = { code: 'test-code', state: 'test-state' };
      const expectedResult = { success: true, redirectUrl: 'https://example.com' };
      jest.spyOn(authService, 'exchangeTempAuthToken').mockResolvedValue(expectedResult);

      // Act
      const result = await authController.exchangeTempAuthToken(
        query,
        `${SLACK_OAUTH_STATE_COOKIE_NAME}=cookie-value`,
        response as Response,
      );

      // Assert
      expect(result).toBeUndefined();
      expect(authService.exchangeTempAuthToken).toHaveBeenCalledWith(query, 'cookie-value');
      expect(response.clearCookie).toHaveBeenCalledWith(SLACK_OAUTH_STATE_COOKIE_NAME, {
        path: '/auth',
      });
      expect(response.redirect).toHaveBeenCalledWith('https://example.com');
    });

    it('should return json when requested explicitly', async () => {
      const query = { code: 'test-code', state: 'test-state', format: 'json' };
      const expectedResult = { success: true, redirectUrl: 'https://example.com' };
      jest.spyOn(authService, 'exchangeTempAuthToken').mockResolvedValue(expectedResult);

      const result = await authController.exchangeTempAuthToken(
        query,
        `${SLACK_OAUTH_STATE_COOKIE_NAME}=cookie-value`,
        response as Response,
      );

      expect(result).toBe(expectedResult);
      expect(response.redirect).not.toHaveBeenCalled();
    });

    it('should throw HttpException when auth service throws an error', async () => {
      // Arrange
      const query: TempAuthTokenDTO = { code: 'test-code', state: 'test-state' };
      jest.spyOn(authService, 'exchangeTempAuthToken').mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(
        authController.exchangeTempAuthToken(query, undefined, response as Response),
      ).rejects.toThrow(HttpException);
      expect(authService.exchangeTempAuthToken).toHaveBeenCalledWith(query, undefined);
    });

    it('should preserve HttpException from auth service', async () => {
      const query: TempAuthTokenDTO = { code: 'test-code', state: 'test-state' };
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT);
      jest.spyOn(authService, 'exchangeTempAuthToken').mockRejectedValue(exception);

      await expect(
        authController.exchangeTempAuthToken(query, undefined, response as Response),
      ).rejects.toBe(exception);
      expect(authService.exchangeTempAuthToken).toHaveBeenCalledWith(query, undefined);
    });
  });
});
