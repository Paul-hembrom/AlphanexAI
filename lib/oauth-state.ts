import crypto from 'crypto';

/**
 * Signed OAuth state generator and validator.
 * Prevents CSRF attacks and binds the authenticated userId and provider securely to the flow.
 */

const STATE_SECRET =
  process.env.STATE_SECRET ||
  process.env.ENCRYPTION_SECRET ||
  'ai-festa-studio-oauth-state-hmac-secret-2026';

export interface OAuthStatePayload {
  userId: string;
  provider: 'github' | 'google';
  nonce: string;
  timestamp: number;
}

export function generateSignedState(userId: string, provider: 'github' | 'google'): string {
  const payload: OAuthStatePayload = {
    userId,
    provider,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', STATE_SECRET).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

export function verifySignedState(
  state: string | null | undefined,
  expectedProvider?: 'github' | 'google'
): OAuthStatePayload | null {
  if (!state || !state.includes('.')) return null;
  const [data, signature] = state.split('.');
  if (!data || !signature) return null;

  try {
    const expectedHmac = crypto.createHmac('sha256', STATE_SECRET).update(data).digest('base64url');
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedHmac);

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      console.warn('[oauth-state] State signature mismatch');
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as OAuthStatePayload;

    // Check expiration (valid for 15 minutes)
    if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
      console.warn('[oauth-state] State expired (>15m)');
      return null;
    }

    if (expectedProvider && payload.provider !== expectedProvider) {
      console.warn(`[oauth-state] State provider mismatch: expected ${expectedProvider}, got ${payload.provider}`);
      return null;
    }

    return payload;
  } catch (err) {
    console.warn('[oauth-state] Error parsing state:', err);
    return null;
  }
}
