// In-memory verification code store with 15-minute expiration
// Key: normalized email, Value: { code: string; expiresAt: number }

declare global {
  var __AUTH_VERIFICATION_STORE__: Map<string, { code: string; expiresAt: number }> | undefined;
}

if (!globalThis.__AUTH_VERIFICATION_STORE__) {
  globalThis.__AUTH_VERIFICATION_STORE__ = new Map();
}

const verificationStore = globalThis.__AUTH_VERIFICATION_STORE__;

export function storeVerificationCode(email: string, code: string, durationMs: number = 15 * 60 * 1000) {
  const normalized = email.trim().toLowerCase();
  verificationStore.set(normalized, {
    code,
    expiresAt: Date.now() + durationMs,
  });
}

export function getStoredVerificationCode(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const record = verificationStore.get(normalized);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    verificationStore.delete(normalized);
    return null;
  }
  return record.code;
}

export function clearStoredVerificationCode(email: string) {
  verificationStore.delete(email.trim().toLowerCase());
}
