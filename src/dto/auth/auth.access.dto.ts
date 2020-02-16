export class OauthAccessDto {
  ok: string;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: Team;
  enterprise: Enterprise;
  authed_user: AuthedUser;
}

export class Team {
  name: string;
  id: string;
}
export class Enterprise {
  name: string;
  id: string;
}
export class AuthedUser {
  id: string;
  scope: string;
  access_token: string;
  token_type: string;
}
