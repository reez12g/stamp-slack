import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../providers/auth/auth.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            exchangeTempAuthToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('exchangeTempAuthToken', () => {
    it('should exchange temporary auth token successfully', async () => {
      // Arrange
      const query: TempAuthTokenDTO = { code: 'test-code', state: 'test-state' };
      const expectedResult = { success: true, redirectUrl: 'https://example.com' };
      jest.spyOn(authService, 'exchangeTempAuthToken').mockResolvedValue(expectedResult);

      // Act
      const result = await authController.exchangeTempAuthToken(query);

      // Assert
      expect(result).toBe(expectedResult);
      expect(authService.exchangeTempAuthToken).toHaveBeenCalledWith(query);
    });

    it('should throw HttpException when auth service throws an error', async () => {
      // Arrange
      const query: TempAuthTokenDTO = { code: 'test-code', state: 'test-state' };
      jest.spyOn(authService, 'exchangeTempAuthToken').mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(authController.exchangeTempAuthToken(query)).rejects.toThrow(HttpException);
      expect(authService.exchangeTempAuthToken).toHaveBeenCalledWith(query);
    });

    it('should preserve HttpException from auth service', async () => {
      const query: TempAuthTokenDTO = { code: 'test-code', state: 'test-state' };
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT);
      jest.spyOn(authService, 'exchangeTempAuthToken').mockRejectedValue(exception);

      await expect(authController.exchangeTempAuthToken(query)).rejects.toBe(exception);
      expect(authService.exchangeTempAuthToken).toHaveBeenCalledWith(query);
    });
  });
});
