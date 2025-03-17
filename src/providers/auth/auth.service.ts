import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/auth/user.entity';
import { lastValueFrom, map } from 'rxjs';
import { OauthAccessDto } from '../../dto/auth/auth.access.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
  ) {}

  async exchangeTempAuthToken(query: { code: string }) {
    const oauthAccessURL = 'https://slack.com/api/oauth.v2.access';
    const data = {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: query.code,
    };
    const body = Object.keys(data)
      .map(key => {
        const k = key as keyof typeof data;
        return key + '=' + encodeURIComponent(data[k]);
      })
      .join('&');
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    try {
      const response$ = this.httpService.post(oauthAccessURL, body, config).pipe(
        map(response => {
          const oauthAccess: OauthAccessDto = response.data;
          return this.registerAuthToken(oauthAccess);
        }),
      );
      return await lastValueFrom(response$);
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
    return { success: true, redirectUrl: 'https://miro.medium.com/max/5000/1*QqoS6WsjG6WSr9-BFFQhbA.jpeg' };
  }

  async preventSameUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    this.logger.debug(`Checking if user exists: ${id}`);
    if (user) {
      throw new Error('User is already registered.');
    }
  }

  async getUserToken(id: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return user.access_token;
  }
}
