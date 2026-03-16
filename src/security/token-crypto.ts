import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const TOKEN_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const TOKEN_ENCRYPTION_IV_BYTES = 12;

function buildEncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(value: string, secret: string): string {
  const iv = randomBytes(TOKEN_ENCRYPTION_IV_BYTES);
  const cipher = createCipheriv(TOKEN_ENCRYPTION_ALGORITHM, buildEncryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptToken(value: string, secret: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split('.');

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error('Encrypted token payload is malformed');
  }

  const decipher = createDecipheriv(
    TOKEN_ENCRYPTION_ALGORITHM,
    buildEncryptionKey(secret),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
