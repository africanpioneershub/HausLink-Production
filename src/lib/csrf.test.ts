import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('csrf', () => {
  beforeEach(() => {
    vi.stubEnv('CSRF_SECRET', 'test-secret-value');
    vi.resetModules();
  });

  it('validates a token when the cookie matches the header and both were minted for this user', async () => {
    const { generateCsrfToken, validateCsrfToken } = await import('./csrf');
    const token = generateCsrfToken('user-1');

    expect(validateCsrfToken(token, token, 'user-1')).toBe(true);
  });

  it('rejects when the header does not match the cookie -- the double-submit check', async () => {
    const { generateCsrfToken, validateCsrfToken } = await import('./csrf');
    const cookieToken = generateCsrfToken('user-1');
    const headerToken = generateCsrfToken('user-1'); // different nonce, different token

    expect(validateCsrfToken(cookieToken, headerToken, 'user-1')).toBe(false);
  });

  it('rejects a token minted for a different user -- session binding', async () => {
    // The core fix: previously any validly-signed token worked for anyone.
    // A token minted for one user's session must not validate for another.
    const { generateCsrfToken, validateCsrfToken } = await import('./csrf');
    const tokenForVictim = generateCsrfToken('victim-user');

    expect(validateCsrfToken(tokenForVictim, tokenForVictim, 'attacker-user')).toBe(false);
  });

  it('rejects a token whose signature does not match (tampered payload)', async () => {
    const { generateCsrfToken, validateCsrfToken } = await import('./csrf');
    const token = generateCsrfToken('user-1');
    const [userId, nonce, ts] = token.split(':');
    const tampered = `${userId}:${nonce}:${ts}:0000000000000000000000000000000000000000000000000000000000000000`;

    expect(validateCsrfToken(tampered, tampered, 'user-1')).toBe(false);
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers();
    const { generateCsrfToken, validateCsrfToken } = await import('./csrf');
    const token = generateCsrfToken('user-1');

    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // well past the 1h TTL
    expect(validateCsrfToken(token, token, 'user-1')).toBe(false);
    vi.useRealTimers();
  });

  it('rejects when either the cookie or the header is missing', async () => {
    const { generateCsrfToken, validateCsrfToken } = await import('./csrf');
    const token = generateCsrfToken('user-1');

    expect(validateCsrfToken(null, token, 'user-1')).toBe(false);
    expect(validateCsrfToken(token, null, 'user-1')).toBe(false);
  });

  it('getCookieValue extracts a named cookie from the raw Cookie header', async () => {
    const { getCookieValue } = await import('./csrf');
    const request = new Request('http://localhost/', {
      headers: { cookie: 'other=1; csrf_token=abc%3Adef; another=2' },
    });

    expect(getCookieValue(request, 'csrf_token')).toBe('abc:def');
    expect(getCookieValue(request, 'missing')).toBeNull();
  });
});
