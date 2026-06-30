import { createHmac, timingSafeEqual } from 'crypto';
import { SECURITY } from '@/lib/constants';
import '@/lib/env-check';

const SECRET = process.env.CSRF_SECRET ?? '';

if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    '[CSRF] FATAL: CSRF_SECRET environment variable is not set in production. ' +
    'The application cannot start safely without it — all CSRF-protected routes ' +
    'would silently reject every request. Set CSRF_SECRET in Vercel environment ' +
    'variables and redeploy.'
  );
}

export function generateCsrfToken(): string {
  const nonce = Math.random().toString(36).slice(2);
  const ts = Date.now().toString(36);
  const payload = `${nonce}:${ts}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function validateCsrfToken(token: string): boolean {
  if (!SECRET) return false;
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const issuedAtMs = parseInt(parts[1], 36);
  if (isNaN(issuedAtMs) || Date.now() - issuedAtMs > SECURITY.CSRF_TOKEN_TTL_SECONDS * 1000) {
    return false;
  }

  const payload = `${parts[0]}:${parts[1]}`;
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(parts[2], 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
