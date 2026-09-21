import crypto from 'crypto';

/**
 * Robust cryptographic helper for encrypting and decrypting OAuth tokens at rest.
 * Uses AES-256-GCM with a randomized 12-byte initialization vector and 16-byte authentication tag.
 */

const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  process.env.STATE_SECRET ||
  'ai-festa-studio-oauth-token-encryption-key-2026';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

/**
 * Encrypts a plaintext token string into format: `ivHex:authTagHex:encryptedHex`
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('[crypto] Failed to encrypt token:', err);
    throw new Error('Token encryption failed');
  }
}

/**
 * Decrypts an encrypted token string. If the token is not encrypted (e.g. legacy or plaintext),
 * it returns the string directly.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    // Unencrypted or legacy raw token fallback
    return encryptedString;
  }

  try {
    const [ivHex, tagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(contentHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[crypto] Failed to decrypt token:', err);
    return '';
  }
}
