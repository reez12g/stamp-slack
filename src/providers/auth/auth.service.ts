import { HttpService, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/auth/user.entity';
import { map } from 'rxjs/operators';
import { OauthAccessDto } from '../../dto/auth/auth.access.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly http: HttpService,
  ) {}

  async exchangeTempAuthToken(query) {
    const oauthAccessURL = 'https://slack.com/api/oauth.v2.access';
    const data = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      client_id: process.env.SLACK_CLIENT_ID,
      // eslint-disable-next-line @typescript-eslint/camelcase
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: query.code,
    };
    const body = Object.keys(data)
      .map(key => key + '=' + encodeURIComponent(data[key]))
      .join('&');
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    return this.http.post(oauthAccessURL, body, config).pipe(
      map(response => {
        const oauthAccess: OauthAccessDto = response.data;
        this.registerAuthToken(oauthAccess);
      }),
    );
  }

  async registerAuthToken(oauthAccess) {
    const userId = oauthAccess.authed_user.id;
    await this.preventSameUser(userId);
    await this.userRepository.insert({
      id: userId,
      scope: oauthAccess.authed_user.scope,
      // eslint-disable-next-line @typescript-eslint/camelcase
      access_token: oauthAccess.authed_user.access_token,
    });
    window.location.href =
      'https://miro.medium.com/max/5000/1*QqoS6WsjG6WSr9-BFFQhbA.jpeg';
  }

  async preventSameUser(id) {
    const user = await this.userRepository.findOne({ id: id });
    console.log(user);
    if (!!user) {
      return Promise.reject(new Error('User is already registered.'));
    }
  }

  async getUserToken(id) {
    const user = await this.userRepository.findOne({ id: id });
    return user.access_token;
  }
}
