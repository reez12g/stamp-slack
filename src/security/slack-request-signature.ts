import { createHmac, timingSafeEqual } from 'crypto';

const SLACK_SIGNATURE_VERSION = 'v0';
const SLACK_TIMESTAMP_TOLERANCE_SECONDS = 60 * 5;

function normalizeBody(body: Buffer | string): string {
  return Buffer.isBuffer(body) ? body.toString('utf8') : body;
}

export function createSlackSignature(
  secret: string,
  timestamp: string,
  body: Buffer | string,
): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(`${SLACK_SIGNATURE_VERSION}:${timestamp}:${normalizeBody(body)}`);
  return `${SLACK_SIGNATURE_VERSION}=${hmac.digest('hex')}`;
}

export function isSlackTimestampFresh(
  timestamp: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime)) {
    return false;
  }

  return Math.abs(nowSeconds - requestTime) <= SLACK_TIMESTAMP_TOLERANCE_SECONDS;
}

export function isValidSlackSignature(params: {
  secret: string;
  timestamp: string;
  signature: string;
  body: Buffer | string;
  nowSeconds?: number;
}): boolean {
  const { secret, timestamp, signature, body, nowSeconds } = params;

  if (!secret || !timestamp || !signature || !isSlackTimestampFresh(timestamp, nowSeconds)) {
    return false;
  }

  const expected = createSlackSignature(secret, timestamp, body);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
