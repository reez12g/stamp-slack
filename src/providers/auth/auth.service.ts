import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/auth/user.entity';
import { lastValueFrom } from 'rxjs';
import { OauthAccessDto } from '../../dto/auth/auth.access.dto';

const DEFAULT_AUTH_SUCCESS_REDIRECT_URL =
  'https://miro.medium.com/max/5000/1*QqoS6WsjG6WSr9-BFFQhbA.jpeg';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
  ) {}

  async exchangeTempAuthToken(query: { code: string }) {
    if (!query.code) {
      throw new BadRequestException('Slack authorization code is required');
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Slack OAuth is not configured');
    }

    const oauthAccessURL = 'https://slack.com/api/oauth.v2.access';
    const data = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: query.code,
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

      if (!oauthAccess.authed_user?.id || !oauthAccess.authed_user?.access_token) {
        throw new BadGatewayException(
          'Slack OAuth response did not include an authorized user',
        );
      }

      return await this.registerAuthToken(oauthAccess);
    } catch (error: any) {
      this.logger.error(`Error exchanging temp auth token: ${error.message}`, error.stack);
      throw error;
    }
  }

  async registerAuthToken(oauthAccess: OauthAccessDto) {
    const userId = oauthAccess.authed_user.id;
    await this.preventSameUser(userId);
    await this.userRepository.insert({
      id: userId,
      scope: oauthAccess.authed_user.scope,
      access_token: oauthAccess.authed_user.access_token,
    });
    return {
      success: true,
      redirectUrl: process.env.AUTH_SUCCESS_REDIRECT_URL ?? DEFAULT_AUTH_SUCCESS_REDIRECT_URL,
    };
  }

  async preventSameUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    this.logger.debug(`Checking if user exists: ${id}`);
    if (user) {
      throw new ConflictException('User is already registered.');
    }
  }

  async getUserToken(id: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.access_token;
  }
}
