import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const SLACK_OAUTH_STATE_COOKIE_NAME = 'slack_oauth_state';
export const SLACK_OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  nonce: string;
  issuedAt: number;
};

function encodeStatePayload(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeStatePayload(value: string): OAuthStatePayload | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as OAuthStatePayload;
  } catch {
    return null;
  }
}

function createStateSignature(secret: string, payload: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest();
}

export function createOAuthState(secret: string): { nonce: string; token: string } {
  const payload = encodeStatePayload({
    nonce: randomBytes(18).toString('hex'),
    issuedAt: Date.now(),
  });
  const signature = createStateSignature(secret, payload).toString('base64url');
  const state = `${payload}.${signature}`;

  return {
    nonce: decodeStatePayload(payload)?.nonce ?? '',
    token: state,
  };
}

export function isValidOAuthState(params: {
  secret: string;
  state: string;
  cookieNonce?: string;
  now?: number;
}): boolean {
  const { secret, state, cookieNonce, now = Date.now() } = params;
  const separatorIndex = state.indexOf('.');

  if (!secret || !state || !cookieNonce || separatorIndex <= 0) {
    return false;
  }

  const payload = state.slice(0, separatorIndex);
  const encodedSignature = state.slice(separatorIndex + 1);
  const parsedPayload = decodeStatePayload(payload);

  if (!parsedPayload) {
    return false;
  }

  if (now - parsedPayload.issuedAt > SLACK_OAUTH_STATE_MAX_AGE_MS) {
    return false;
  }

  const expectedSignature = createStateSignature(secret, payload);
  const actualSignature = Buffer.from(encodedSignature, 'base64url');

  if (expectedSignature.length !== actualSignature.length) {
    return false;
  }

  const expectedNonce = Buffer.from(parsedPayload.nonce, 'utf8');
  const actualNonce = Buffer.from(cookieNonce, 'utf8');

  if (expectedNonce.length !== actualNonce.length) {
    return false;
  }

  return (
    timingSafeEqual(expectedSignature, actualSignature) &&
    timingSafeEqual(expectedNonce, actualNonce)
  );
}
