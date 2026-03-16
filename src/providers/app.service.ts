import { Injectable } from '@nestjs/common';
import {
  getAppBaseUrl,
  getAuthSuccessRedirectUrl,
  getSlackBotScopes,
  getSlackCommandUrl,
  getSlackInstallStartUrl,
  getSlackOAuthRedirectUrl,
  getSlackUserScopes,
} from '../config/slack-app.config';

type SetupItem = {
  label: string;
  value: string;
  ready: boolean;
};

@Injectable()
export class AppService {
  getLandingPage(connected = false) {
    const appBaseUrl = getAppBaseUrl();
    const oauthRedirectUrl = getSlackOAuthRedirectUrl();
    const slashCommandUrl = getSlackCommandUrl();
    const authSuccessRedirectUrl = getAuthSuccessRedirectUrl();
    const botScopes = getSlackBotScopes();
    const userScopes = getSlackUserScopes();
    const addToSlackUrl = process.env.SLACK_CLIENT_ID ? getSlackInstallStartUrl() : null;

    const setupChecklist: SetupItem[] = [
      {
        label: 'Slack client ID',
        value: process.env.SLACK_CLIENT_ID ? 'Configured' : 'Missing',
        ready: Boolean(process.env.SLACK_CLIENT_ID),
      },
      {
        label: 'Slack client secret',
        value: process.env.SLACK_CLIENT_SECRET ? 'Configured' : 'Missing',
        ready: Boolean(process.env.SLACK_CLIENT_SECRET),
      },
      {
        label: 'Slack signing secret',
        value: process.env.SLACK_SIGNING_SECRET ? 'Configured' : 'Missing',
        ready: Boolean(process.env.SLACK_SIGNING_SECRET),
      },
      {
        label: 'App base URL',
        value: appBaseUrl,
        ready: !this.isLocalhostUrl(appBaseUrl),
      },
      {
        label: 'OAuth redirect URL',
        value: oauthRedirectUrl,
        ready: true,
      },
      {
        label: 'Slash command request URL',
        value: slashCommandUrl,
        ready: true,
      },
      {
        label: 'Post-auth redirect',
        value: authSuccessRedirectUrl,
        ready: true,
      },
    ];

    return {
      title: 'Stamp Slack',
      connected,
      addToSlackUrl,
      appBaseUrl,
      oauthRedirectUrl,
      slashCommandUrl,
      authSuccessRedirectUrl,
      botScopes,
      userScopes,
      hasUserScopes: userScopes.length > 0,
      botScopesText: botScopes.join(', '),
      userScopesText: userScopes.join(', '),
      setupChecklist,
      needsPublicBaseUrl: this.isLocalhostUrl(appBaseUrl),
    };
  }

  private isLocalhostUrl(value: string): boolean {
    return /localhost|127\.0\.0\.1/.test(value);
  }
}
