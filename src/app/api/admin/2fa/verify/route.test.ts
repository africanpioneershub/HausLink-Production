import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';

vi.mock('@/lib/redis/ratelimit', () => ({
  authRateLimit: {},
  applyRateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
}));

const userFindUnique = vi.fn();
vi.mock('@/lib/prisma/client', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => userFindUnique(...args) } },
}));

const setSession = vi.fn().mockResolvedValue(undefined);
const getSession = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/redis/session', () => ({
  setSession: (...args: unknown[]) => setSession(...args),
  getSession: (...args: unknown[]) => getSession(...args),
}));

const redisSet = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/redis/client', () => ({ redis: { set: (...args: unknown[]) => redisSet(...args), get: vi.fn() } }));

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: (...args: unknown[]) => getUser(...args) } }),
}));
vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: () => true,
  getCookieValue: () => 'test-token',
  CSRF_COOKIE_NAME: 'csrf_token',
}));
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true }));

function makeRequest(code: string) {
  return new Request('http://localhost/api/admin/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-token' },
    body: JSON.stringify({ code }),
  });
}

describe('POST /api/admin/2fa/verify', () => {
  let encryptedSecret: string;
  let realSecret: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('TOTP_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
    vi.resetModules();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@hauslink.com', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });

    const { encryptTotpSecret } = await import('@/lib/auth/totpSecret');
    realSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    encryptedSecret = encryptTotpSecret(realSecret);
  });

  it('rejects an admin who has never enrolled', async () => {
    userFindUnique.mockResolvedValue({ totp_secret_encrypted: null, totp_enrolled_at: null });

    const { POST } = await import('./route');
    const res = await POST(makeRequest('123456'));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe('ENROLLMENT_REQUIRED');
    expect(setSession).not.toHaveBeenCalled();
  });

  it('accepts a correct code against this admin\'s own enrolled secret', async () => {
    userFindUnique.mockResolvedValue({ totp_secret_encrypted: encryptedSecret, totp_enrolled_at: new Date() });
    const code = authenticator.generate(realSecret);

    const { POST } = await import('./route');
    const res = await POST(makeRequest(code));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.twoFaVerified).toBe(true);
    expect(redisSet).toHaveBeenCalledWith('admin:2fa:admin-1', '1', expect.any(Object));
  });

  it('rejects a code that does not match this admin\'s enrolled secret', async () => {
    userFindUnique.mockResolvedValue({ totp_secret_encrypted: encryptedSecret, totp_enrolled_at: new Date() });

    const { POST } = await import('./route');
    const res = await POST(makeRequest('000000'));

    expect(res.status).toBe(400);
    expect(setSession).not.toHaveBeenCalled();
  });

  it('rejects a valid code minted for a DIFFERENT admin\'s secret -- the shared-secret vulnerability this closes', async () => {
    const { encryptTotpSecret } = await import('@/lib/auth/totpSecret');
    const otherAdminSecret = 'ANOTHERSECRETFORDIFFERENTADMIN2';
    userFindUnique.mockResolvedValue({
      totp_secret_encrypted: encryptTotpSecret(otherAdminSecret),
      totp_enrolled_at: new Date(),
    });
    const codeFromWrongAdmin = authenticator.generate(realSecret); // generated from a DIFFERENT admin's secret

    const { POST } = await import('./route');
    const res = await POST(makeRequest(codeFromWrongAdmin));

    expect(res.status).toBe(400);
  });
});
