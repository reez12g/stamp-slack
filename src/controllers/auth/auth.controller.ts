import {
  Controller,
  Query,
  Get,
  Headers,
  Logger,
  HttpException,
  InternalServerErrorException,
  Res,
} from '@nestjs/common';
import { AuthService } from '../../providers/auth/auth.service';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';
import { Response } from 'express';
import { SLACK_OAUTH_STATE_COOKIE_NAME } from '../../security/oauth-state';

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('start')
  startSlackInstall(@Res() response: Response) {
    const result = this.authService.beginInstallation();

    response.cookie(SLACK_OAUTH_STATE_COOKIE_NAME, result.stateCookieValue, {
      httpOnly: true,
      maxAge: result.stateCookieMaxAgeMs,
      path: '/auth',
      sameSite: 'lax',
      secure: result.secureCookie,
    });
    response.redirect(result.redirectUrl);
  }

  @Get()
  async exchangeTempAuthToken(
    @Query() query: TempAuthTokenDTO,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.exchangeTempAuthToken(
        query,
        getCookieValue(cookieHeader, SLACK_OAUTH_STATE_COOKIE_NAME),
      );

      if (query.format === 'json') {
        return result;
      }

      response.clearCookie(SLACK_OAUTH_STATE_COOKIE_NAME, { path: '/auth' });
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
