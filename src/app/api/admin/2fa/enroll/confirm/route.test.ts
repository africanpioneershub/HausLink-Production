import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';

vi.mock('@/lib/redis/ratelimit', () => ({
  authRateLimit: {},
  applyRateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
}));

const userFindUnique = vi.fn();
const userUpdate = vi.fn().mockResolvedValue({});
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
  },
}));

const setSession = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/redis/session', () => ({ setSession: (...args: unknown[]) => setSession(...args) }));

const redisSet = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/redis/client', () => ({ redis: { set: (...args: unknown[]) => redisSet(...args), get: vi.fn() } }));

vi.mock('@/lib/audit/logger', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

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
  return new Request('http://localhost/api/admin/2fa/enroll/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-token' },
    body: JSON.stringify({ code }),
  });
}

describe('POST /api/admin/2fa/enroll/confirm', () => {
  let encryptedSecret: string;
  let realSecret: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('TOTP_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
    vi.resetModules();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });

    const { encryptTotpSecret } = await import('@/lib/auth/totpSecret');
    realSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    encryptedSecret = encryptTotpSecret(realSecret);
  });

  it('rejects confirmation when no enrollment was started', async () => {
    userFindUnique.mockResolvedValue({ totp_secret_encrypted: null });

    const { POST } = await import('./route');
    const res = await POST(makeRequest('123456'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('NOT_STARTED');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects an incorrect code and does not activate enrollment', async () => {
    userFindUnique.mockResolvedValue({ totp_secret_encrypted: encryptedSecret });

    const { POST } = await import('./route');
    const res = await POST(makeRequest('000000'));

    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('activates enrollment on a correct code -- sets totp_enrolled_at and establishes the 2FA session immediately', async () => {
    userFindUnique.mockResolvedValue({ totp_secret_encrypted: encryptedSecret });
    const code = authenticator.generate(realSecret);

    const { POST } = await import('./route');
    const res = await POST(makeRequest(code));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.enrolled).toBe(true);
    expect(json.data.twoFaVerified).toBe(true);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'admin-1' }, data: expect.objectContaining({ totp_enrolled_at: expect.any(Date) }) })
    );
    expect(redisSet).toHaveBeenCalledWith('admin:2fa:admin-1', '1', expect.any(Object));
  });
});
