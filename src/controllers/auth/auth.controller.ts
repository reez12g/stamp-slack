import { Controller, Query, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
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
      throw new HttpException(
        'Failed to authenticate with Slack',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
