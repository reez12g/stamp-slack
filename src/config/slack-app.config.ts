const DEFAULT_PORT = '3000';
const DEFAULT_SLACK_BOT_SCOPES = ['commands', 'chat:write', 'emoji:read'];
const DEFAULT_SLACK_USER_SCOPES: string[] = [];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseScopes(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  const scopes = value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return scopes.length > 0 ? scopes : fallback;
}

export function getAppBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configuredBaseUrl = env.APP_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return `http://localhost:${env.PORT ?? DEFAULT_PORT}`;
}

export function getSlackBotScopes(env: NodeJS.ProcessEnv = process.env): string[] {
  return parseScopes(env.SLACK_BOT_SCOPES, DEFAULT_SLACK_BOT_SCOPES);
}

export function getSlackUserScopes(env: NodeJS.ProcessEnv = process.env): string[] {
  return parseScopes(env.SLACK_USER_SCOPES, DEFAULT_SLACK_USER_SCOPES);
}

export function getSlackOAuthRedirectUrl(env: NodeJS.ProcessEnv = process.env): string {
  return `${getAppBaseUrl(env)}/auth`;
}

export function getSlackInstallStartUrl(env: NodeJS.ProcessEnv = process.env): string {
  return `${getAppBaseUrl(env)}/auth/start`;
}

export function getSlackCommandUrl(env: NodeJS.ProcessEnv = process.env): string {
  return `${getAppBaseUrl(env)}/stamp`;
}

export function getAuthSuccessRedirectUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configuredRedirectUrl = env.AUTH_SUCCESS_REDIRECT_URL?.trim();
  if (configuredRedirectUrl) {
    return configuredRedirectUrl;
  }

  return `${getAppBaseUrl(env)}/?connected=1`;
}

export function buildSlackInstallUrl(
  env: NodeJS.ProcessEnv = process.env,
  state?: string,
): string | null {
  const clientId = env.SLACK_CLIENT_ID?.trim();
  if (!clientId) {
    return null;
  }

  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getSlackOAuthRedirectUrl(env));

  const botScopes = getSlackBotScopes(env);
  if (botScopes.length > 0) {
    url.searchParams.set('scope', botScopes.join(','));
  }

  const userScopes = getSlackUserScopes(env);
  if (userScopes.length > 0) {
    url.searchParams.set('user_scope', userScopes.join(','));
  }

  if (state) {
    url.searchParams.set('state', state);
  }

  return url.toString();
}
