import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: (...args: unknown[]) => getUser(...args) } }),
}));

const updateUser = vi.fn().mockResolvedValue({});
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { auth: { admin: { updateUserById: (...args: unknown[]) => updateUser(...args) } } },
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
vi.mock('@/lib/csrf', () => ({ validateCsrfToken: () => true }));
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

  it('activates a PENDING user with a confirmed email -- Prisma and Supabase metadata both flip to ACTIVE', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          user_metadata: { role: 'TENANT', status: 'PENDING' },
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
    expect(updateUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ user_metadata: expect.objectContaining({ status: 'ACTIVE' }) })
    );
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'ACCOUNT_ACTIVATED', entityId: 'user-1' }));
  });

  it('is a no-op for a user who is already ACTIVE -- does not re-write status', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
          email_confirmed_at: '2026-09-01T00:00:00Z',
          user_metadata: { role: 'TENANT', status: 'ACTIVE' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects a PENDING user whose email is not actually confirmed -- never trust the client, re-check server-side', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-3',
          email_confirmed_at: null,
          user_metadata: { role: 'TENANT', status: 'PENDING' },
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
          user_metadata: { role: 'TENANT', status: 'BANNED' },
        },
      },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
