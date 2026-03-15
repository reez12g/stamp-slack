import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from '../providers/app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getLandingPage: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return the landing page model', () => {
      const expectedModel = { title: 'Stamp Slack', connected: true };
      jest.spyOn(appService, 'getLandingPage').mockReturnValue(expectedModel as never);

      expect(appController.getLandingPage('1')).toBe(expectedModel);
      expect(appService.getLandingPage).toHaveBeenCalledWith(true);
    });
  });
});
