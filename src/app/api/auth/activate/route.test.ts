import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: (...args: unknown[]) => getUser(...args) } }),
}));

const updateAppMetadata = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/supabase/admin', () => ({
  updateAppMetadata: (...args: unknown[]) => updateAppMetadata(...args),
}));

const userUpdate = vi.fn().mockResolvedValue({});
vi.mock('@/lib/prisma/client', () => ({
  prisma: { user: { update: (...args: unknown[]) => userUpdate(...args) } },
}));

const deleteCache = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/redis/cache', () => ({
  deleteCache: (...args: unknown[]) => deleteCache(...args),
  CACHE_KEYS: { userProfile: (id: string) => `user:profile:${id}` },
}));

const logAudit = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit/logger', () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
}));

// withAuth itself is exercised for real (not mocked) so the CSRF/role/
// banned-status checks it already provides stay covered by this test too.
vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: () => true,
  getCookieValue: () => 'test-token',
  CSRF_COOKIE_NAME: 'csrf_token',
}));
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true }));
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn() } }));

function makeRequest() {
  return new Request('http://localhost/api/auth/activate', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('POST /api/auth/activate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activates a PENDING user with a confirmed email -- Prisma and Supabase app_metadata both flip to ACTIVE', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          app_metadata: { role: 'TENANT', status: 'PENDING' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ACTIVE');

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { status: 'ACTIVE' } });
    expect(updateAppMetadata).toHaveBeenCalledWith('user-1', { status: 'ACTIVE' });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'ACCOUNT_ACTIVATED', entityId: 'user-1' }));
  });

  it('is a no-op for a user who is already ACTIVE -- does not re-write status', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          app_metadata: { role: 'TENANT', status: 'ACTIVE' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(updateAppMetadata).not.toHaveBeenCalled();
  });

  it('rejects a PENDING user whose email is not actually confirmed -- never trust the client, re-check server-side', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-3',
          email_confirmed_at: null,
          app_metadata: { role: 'TENANT', status: 'PENDING' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('EMAIL_NOT_VERIFIED');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a BANNED user via the existing withAuth guard -- never reactivates a banned account', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-4',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          app_metadata: { role: 'TENANT', status: 'BANNED' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('ignores a forged user_metadata.status and reads app_metadata instead', async () => {
    // A user cannot self-activate by calling
    // supabase.auth.updateUser({ data: { status: 'ACTIVE' } }) -- that only
    // writes user_metadata, which this route (and withAuth) must never read.
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-5',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          app_metadata: { role: 'TENANT', status: 'PENDING' },
          user_metadata: { status: 'ACTIVE' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // Still treated as PENDING (from app_metadata) and genuinely activated --
    // not skipped as if it were already ACTIVE (which the forged
    // user_metadata would incorrectly imply).
    expect(updateAppMetadata).toHaveBeenCalledWith('user-5', { status: 'ACTIVE' });
  });
});
