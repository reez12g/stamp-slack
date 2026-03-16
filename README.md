# Stamp Slack

A NestJS application that installs into Slack, accepts `/stamp :emoji:` slash commands,
and posts a larger version of that emoji back into the channel.

## Features

- Slack OAuth install flow with workspace-scoped bot token storage
- Signed slash command endpoint with immediate acknowledgement
- Friendly onboarding page at `/` with the exact URLs Slack needs
- PostgreSQL persistence via TypeORM migrations

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
npm run migration:run
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
   - add bot scopes `commands`, `chat:write`, and `emoji:read`
3. In `Slash Commands`:
   - create `/stamp`
   - set the request URL to `<APP_BASE_URL>/stamp`
4. Copy `Client ID`, `Client Secret`, and `Signing Secret` into `.env`.
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
- `SLACK_SIGNING_SECRET`

Optional values:

- `SLACK_BOT_SCOPES`
- `SLACK_STATE_SECRET`
- `TOKEN_ENCRYPTION_SECRET`
- `EMOJI_CACHE_TTL_MS`
- `AUTH_SUCCESS_REDIRECT_URL`

## Usage

1. Install the app into your Slack workspace.
2. Use the slash command followed by a single emoji name.

Example:

```
/stamp :thumbsup:
```

If the app says the workspace is not installed, open the app root page and click `Add to Slack`.

If you are upgrading from an older per-user token version of this app, reinstall the app in Slack once.
Workspace installations are now stored in a new `slack_installations` table.

## Database Migrations

Run migrations explicitly with:

```bash
npm run migration:run
```

Revert the most recent migration with:

```bash
npm run migration:revert
```

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
