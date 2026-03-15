# Stamp Slack

A NestJS application that installs into Slack, accepts `/stamp :emoji:` slash commands,
and posts a larger version of that emoji back into the channel.

## Features

- Slack OAuth install flow with user token storage
- Slash command endpoint for posting large custom emoji
- Friendly onboarding page at `/` with the exact URLs Slack needs
- PostgreSQL persistence via TypeORM

## Prerequisites

- Node.js 20.19+, 22.13+, or 24+
- Docker Desktop or a local PostgreSQL instance
- A Slack workspace where you can create apps

## Quick Start

1. Clone the repository and install the supported Node version:

```bash
nvm install
nvm use
npm install
```

2. Start PostgreSQL:

```bash
npm run db:start
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Start the app:

```bash
npm run start:dev
```

5. Open `http://localhost:3000`. The landing page shows:
   - the OAuth redirect URL
   - the slash command request URL
   - the bot and user scopes you need
   - whether your current `.env` is complete

## Local Slack Setup

Slack cannot call `localhost` directly. For local development:

1. Start the app with `npm run start:dev`.
2. Expose it through an HTTPS tunnel such as `ngrok` or `cloudflared`.
3. Set `APP_BASE_URL` in `.env` to that public HTTPS URL.
4. Restart the app.

## Create the Slack App

1. Create an app at `https://api.slack.com/apps`.
2. In `OAuth & Permissions`:
   - set the redirect URL to `<APP_BASE_URL>/auth`
   - add bot scope `commands`
   - add user scopes `chat:write` and `emoji:read`
3. In `Slash Commands`:
   - create `/stamp`
   - set the request URL to `<APP_BASE_URL>/stamp`
4. Copy `Client ID` and `Client Secret` into `.env`.
5. Visit the app root page and click `Add to Slack`.

## Running the Application

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run start:prod
```

## Environment Variables

The minimum required values are:

- `APP_BASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`

Optional values:

- `SLACK_BOT_SCOPES`
- `SLACK_USER_SCOPES`
- `AUTH_SUCCESS_REDIRECT_URL`

## Usage

1. Install the app into your Slack workspace.
2. Complete OAuth once for the Slack user who will call `/stamp`.
3. Use the slash command followed by a single emoji name.

Example:

```
/stamp :thumbsup:
```

If the app says the user is not registered, that Slack user has not completed the OAuth flow yet.

## Verification

Run the standard checks with:

```bash
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

## License

MIT
