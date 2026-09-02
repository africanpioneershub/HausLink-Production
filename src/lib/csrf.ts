import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
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

export const CSRF_COOKIE_NAME = 'csrf_token';

// Every route that checks CSRF (withAuth's CSRF_METHODS block) already
// requires an authenticated session first -- no unauthenticated route in
// this app relies on CSRF protection. That makes it safe, and worthwhile,
// to bind the token to the specific session it was issued for rather than
// handing out a stateless, globally-signed token to anyone who calls
// GET /api/csrf (previously unauthenticated, and valid for any user).
//
// This is a double-submit-cookie scheme with session binding on top:
// - Double-submit: api/csrf/route.ts sets this same value as a
//   non-httpOnly cookie AND returns it in the response body. A legitimate
//   same-origin page can read the cookie (via this response) and echo it
//   back as the x-csrf-token header; a cross-site attacker's script cannot
//   read the victim's cookie to do the same.
// - Session binding: the signed payload embeds the userId the token was
//   minted for, and validateCsrfToken requires it to match the userId of
//   whoever is making the current request -- a token can't be replayed
//   against a different user's session even if it somehow leaked.
export function generateCsrfToken(userId: string): string {
  const nonce = randomBytes(16).toString('hex');
  const ts = Date.now().toString(36);
  const payload = `${userId}:${nonce}:${ts}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function validateCsrfToken(
  cookieToken: string | null | undefined,
  headerToken: string | null | undefined,
  userId: string
): boolean {
  if (!SECRET) return false;
  if (!cookieToken || !headerToken) return false;

  // Double-submit check first, as a plain string compare -- both values
  // came from this same request, there's no timing side-channel to guard
  // against here the way there is for the HMAC comparison below.
  if (cookieToken !== headerToken) return false;

  const parts = cookieToken.split(':');
  if (parts.length !== 4) return false;
  const [tokenUserId, nonce, ts, sig] = parts;

  if (tokenUserId !== userId) return false;

  const issuedAtMs = parseInt(ts, 36);
  if (isNaN(issuedAtMs) || Date.now() - issuedAtMs > SECURITY.CSRF_TOKEN_TTL_SECONDS * 1000) {
    return false;
  }

  const payload = `${tokenUserId}:${nonce}:${ts}`;
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(sig, 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

// withAuth only has access to the raw Cookie header on a plain Request (not
// NextRequest, which most route handlers here don't use), so this is a
// minimal manual parse rather than pulling in a cookie library for one value.
export function getCookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
