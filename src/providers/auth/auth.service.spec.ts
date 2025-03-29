import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { User } from '../../entities/auth/user.entity';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { OauthAccessDto } from '../../dto/auth/auth.access.dto';
import { AxiosResponse } from 'axios';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            insert: jest.fn(),
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
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    httpService = module.get<HttpService>(HttpService);

    // Mock environment variables
    process.env.SLACK_CLIENT_ID = 'test-client-id';
    process.env.SLACK_CLIENT_SECRET = 'test-client-secret';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('exchangeTempAuthToken', () => {
    it('should exchange temporary auth token successfully', async () => {
      // Arrange
      const query = { code: 'test-code' };
      const mockOauthResponse: AxiosResponse = {
        data: {
          ok: 'true',
          access_token: 'xoxp-test-token',
          token_type: 'Bearer',
          scope: 'commands',
          bot_user_id: 'U123456',
          app_id: 'A123456',
          team: { name: 'Test Team', id: 'T123456' },
          enterprise: { name: 'Test Enterprise', id: 'E123456' },
          authed_user: {
            id: 'U123456',
            scope: 'commands',
            access_token: 'xoxp-user-token',
            token_type: 'Bearer',
          },
        } as OauthAccessDto,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockOauthResponse));
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'insert').mockResolvedValue(undefined);

      // Act
      const result = await authService.exchangeTempAuthToken(query);

      // Assert
      expect(httpService.post).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'U123456' } });
      expect(userRepository.insert).toHaveBeenCalledWith({
        id: 'U123456',
        scope: 'commands',
        access_token: 'xoxp-user-token',
      });
      expect(result).toEqual({
        success: true,
        redirectUrl: 'https://miro.medium.com/max/5000/1*QqoS6WsjG6WSr9-BFFQhbA.jpeg',
      });
    });

    it('should throw an error if user already exists', async () => {
      // Arrange
      const query = { code: 'test-code' };
      const mockOauthResponse: AxiosResponse = {
        data: {
          authed_user: {
            id: 'U123456',
            scope: 'commands',
            access_token: 'xoxp-user-token',
            token_type: 'Bearer',
          },
        } as OauthAccessDto,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockOauthResponse));
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({ id: 'U123456', scope: 'commands', access_token: 'xoxp-user-token' });

      // Act & Assert
      await expect(authService.exchangeTempAuthToken(query)).rejects.toThrow('User is already registered.');
      expect(httpService.post).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'U123456' } });
      expect(userRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('getUserToken', () => {
    it('should return user token when user exists', async () => {
      // Arrange
      const userId = 'U123456';
      const mockUser = { id: userId, scope: 'commands', access_token: 'xoxp-user-token' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await authService.getUserToken(userId);

      // Assert
      expect(result).toBe('xoxp-user-token');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should throw an error when user does not exist', async () => {
      // Arrange
      const userId = 'U123456';
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getUserToken(userId)).rejects.toThrow('User not found');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });
  });

  describe('preventSameUser', () => {
    it('should not throw an error if user does not exist', async () => {
      // Arrange
      const userId = 'U123456';
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.preventSameUser(userId)).resolves.not.toThrow();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should throw an error if user already exists', async () => {
      // Arrange
      const userId = 'U123456';
      const mockUser = { id: userId, scope: 'commands', access_token: 'xoxp-user-token' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.preventSameUser(userId)).rejects.toThrow('User is already registered.');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });
  });
});
