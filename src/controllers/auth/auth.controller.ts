import {
  Controller,
  Query,
  Get,
  Logger,
  HttpException,
  InternalServerErrorException,
  Res,
} from '@nestjs/common';
import { AuthService } from '../../providers/auth/auth.service';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private readonly authService: AuthService) {}

  @Get()
  async exchangeTempAuthToken(
    @Query() query: TempAuthTokenDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      this.logger.log(`Exchanging temporary auth token for code: ${query.code}`);
      const result = await this.authService.exchangeTempAuthToken(query);

      if (query.format === 'json') {
        return result;
      }

      response.redirect(result.redirectUrl);
    } catch (error: any) {
      this.logger.error(`Failed to exchange temp auth token: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to authenticate with Slack');
    }
  }
}
