import { Controller, Query, Get, Logger, HttpException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from '../../providers/auth/auth.service';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private readonly authService: AuthService) {}

  @Get()
  async exchangeTempAuthToken(@Query() query: TempAuthTokenDTO) {
    try {
      this.logger.log(`Exchanging temporary auth token for code: ${query.code}`);
      return await this.authService.exchangeTempAuthToken(query);
    } catch (error: any) {
      this.logger.error(`Failed to exchange temp auth token: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to authenticate with Slack');
    }
  }
}
