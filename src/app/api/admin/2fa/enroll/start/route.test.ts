import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'crypto';

vi.mock('@/lib/redis/ratelimit', () => ({
  authRateLimit: {},
  applyRateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
}));

const userUpdate = vi.fn().mockResolvedValue({});
vi.mock('@/lib/prisma/client', () => ({
  prisma: { user: { update: (...args: unknown[]) => userUpdate(...args) } },
}));

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
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn() } }));

function makeRequest() {
  return new Request('http://localhost/api/admin/2fa/enroll/start', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('POST /api/admin/2fa/enroll/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('TOTP_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@hauslink.com', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
  });

  it('generates a secret, a QR code, and stores the secret encrypted -- without activating it', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.secret).toBeTruthy();
    expect(json.data.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(json.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    expect(userUpdate).toHaveBeenCalledTimes(1);
    const [args] = userUpdate.mock.calls[0];
    expect(args.where).toEqual({ id: 'admin-1' });
    // Stored value must be encrypted, not the raw secret in plaintext.
    expect(args.data.totp_secret_encrypted).not.toBe(json.data.secret);
    // enroll/start never sets totp_enrolled_at -- only confirm does.
    expect(args.data).not.toHaveProperty('totp_enrolled_at');
  });
});
