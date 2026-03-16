import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlackInstallation } from '../../entities/auth/slack-installation.entity';
import { lastValueFrom } from 'rxjs';
import { OauthAccessDto } from '../../dto/auth/auth.access.dto';
import {
  buildSlackInstallUrl,
  getAppBaseUrl,
  getAuthSuccessRedirectUrl,
  getSlackOAuthRedirectUrl,
} from '../../config/slack-app.config';
import {
  createOAuthState,
  isValidOAuthState,
  SLACK_OAUTH_STATE_MAX_AGE_MS,
} from '../../security/oauth-state';
import { decryptToken, encryptToken } from '../../security/token-crypto';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(SlackInstallation)
    private readonly installationRepository: Repository<SlackInstallation>,
    private readonly httpService: HttpService,
  ) {}

  beginInstallation() {
    this.assertSlackOauthConfigured();

    const state = createOAuthState(this.getStateSecret());
    const redirectUrl = buildSlackInstallUrl(process.env, state.token);

    if (!redirectUrl) {
      throw new InternalServerErrorException('Slack OAuth is not configured');
    }

    return {
      redirectUrl,
      stateCookieValue: state.nonce,
      stateCookieMaxAgeMs: SLACK_OAUTH_STATE_MAX_AGE_MS,
      secureCookie: this.shouldUseSecureCookies(),
    };
  }

  async exchangeTempAuthToken(query: TempAuthTokenDTO, stateCookie?: string) {
    if (!query.code) {
      throw new BadRequestException('Slack authorization code is required');
    }

    if (!query.state) {
      throw new BadRequestException('Slack authorization state is required');
    }

    if (
      !isValidOAuthState({
        secret: this.getStateSecret(),
        state: query.state,
        cookieNonce: stateCookie,
      })
    ) {
      throw new UnauthorizedException('Slack authorization state is invalid or expired');
    }

    this.assertSlackOauthConfigured();

    const oauthAccessURL = 'https://slack.com/api/oauth.v2.access';
    const data = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID as string,
      client_secret: process.env.SLACK_CLIENT_SECRET as string,
      code: query.code,
      redirect_uri: getSlackOAuthRedirectUrl(),
    });
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post<OauthAccessDto>(oauthAccessURL, data.toString(), config),
      );
      const oauthAccess = response.data;

      if (!oauthAccess.ok) {
        throw new BadGatewayException(
          `Slack OAuth failed: ${oauthAccess.error ?? 'unknown_error'}`,
        );
      }

      if (!oauthAccess.access_token || !oauthAccess.team?.id) {
        throw new BadGatewayException(
          'Slack OAuth response did not include a workspace installation token',
        );
      }

      return await this.registerInstallation(oauthAccess);
    } catch (error: any) {
      this.logger.error(`Error exchanging temp auth token: ${error.message}`, error.stack);
      throw error;
    }
  }

  async registerInstallation(oauthAccess: OauthAccessDto) {
    const teamId = oauthAccess.team?.id;
    const botAccessToken = oauthAccess.access_token;

    if (!teamId || !botAccessToken) {
      throw new BadGatewayException('Slack OAuth response did not include installation data');
    }

    await this.installationRepository.upsert(
      {
        teamId,
        teamName: oauthAccess.team?.name ?? null,
        botAccessToken: encryptToken(botAccessToken, this.getTokenEncryptionSecret()),
        botScopes: oauthAccess.scope ?? '',
        botUserId: oauthAccess.bot_user_id ?? null,
        appId: oauthAccess.app_id ?? null,
        installedByUserId: oauthAccess.authed_user?.id ?? null,
        enterpriseId: oauthAccess.enterprise?.id ?? null,
        enterpriseName: oauthAccess.enterprise?.name ?? null,
      },
      ['teamId'],
    );

    return {
      success: true,
      redirectUrl: getAuthSuccessRedirectUrl(),
    };
  }

  async getBotToken(teamId: string): Promise<string> {
    const installation = await this.installationRepository.findOne({ where: { teamId } });
    if (!installation) {
      throw new NotFoundException('Slack workspace is not installed');
    }

    try {
      return decryptToken(installation.botAccessToken, this.getTokenEncryptionSecret());
    } catch (error: any) {
      this.logger.error(`Failed to decrypt Slack token for team ${teamId}: ${error.message}`);
      throw new InternalServerErrorException('Stored Slack token could not be decrypted');
    }
  }

  private assertSlackOauthConfigured(): void {
    if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
      throw new InternalServerErrorException('Slack OAuth is not configured');
    }
  }

  private getStateSecret(): string {
    const secret = process.env.SLACK_STATE_SECRET?.trim() ?? process.env.SLACK_CLIENT_SECRET?.trim();

    if (!secret) {
      throw new InternalServerErrorException('Slack OAuth state secret is not configured');
    }

    return secret;
  }

  private getTokenEncryptionSecret(): string {
    const secret =
      process.env.TOKEN_ENCRYPTION_SECRET?.trim() ?? process.env.SLACK_CLIENT_SECRET?.trim();

    if (!secret) {
      throw new InternalServerErrorException('Token encryption secret is not configured');
    }

    return secret;
  }

  private shouldUseSecureCookies(): boolean {
    return getAppBaseUrl().startsWith('https://');
  }
}
