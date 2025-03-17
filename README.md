# Stamp Slack

A NestJS application that integrates with Slack to make emojis bigger in Slack channels.

## Features

- OAuth authentication with Slack
- Emoji enlargement in Slack channels
- TypeORM integration with PostgreSQL

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Slack App with appropriate permissions

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

4. Configure your Slack app:
   - Create a Slack app at https://api.slack.com/apps
   - Add the following OAuth scopes:
     - `chat:write`
     - `emoji:read`
   - Set the redirect URL to `http://your-domain/auth`
   - Copy your Client ID and Client Secret to the `.env` file

## Running the Application

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run start:prod
```

## Usage

1. Install the app to your Slack workspace
2. Use the `/stamp` command followed by an emoji name to post a larger version of the emoji

Example:
```
/stamp :thumbsup:
```

## License

MIT
