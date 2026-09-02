import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: (...args: unknown[]) => getUser(...args) } }),
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: () => true,
  getCookieValue: () => 'test-token',
  CSRF_COOKIE_NAME: 'csrf_token',
}));
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true, getClientIp: () => '203.0.113.9' }));
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn().mockResolvedValue('1') } }));

function makeRequest(method = 'GET') {
  return new Request('http://localhost/api/test', {
    method,
    headers: method === 'GET' ? {} : { 'x-csrf-token': 'test-token' },
  });
}

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a request whose role and status in app_metadata satisfy the gate', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u1', app_metadata: { role: 'TENANT', status: 'ACTIVE' } } },
    });

    const { withAuth } = await import('./withAuth');
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(['TENANT'])(handler);
    const res = await wrapped(makeRequest());

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('denies a banned user even when user_metadata claims ACTIVE -- app_metadata is the only trusted source', async () => {
    // Reproduces the self-unban vector directly at the withAuth layer, which
    // gates the ~63 API routes that use it. A banned user calling
    // supabase.auth.updateUser({ data: { status: 'ACTIVE' } }) only ever
    // touches user_metadata; withAuth must never consult it for status.
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'u2',
          app_metadata: { role: 'TENANT', status: 'BANNED' },
          user_metadata: { role: 'TENANT', status: 'ACTIVE' },
        },
      },
    });

    const { withAuth } = await import('./withAuth');
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(['TENANT'])(handler);
    const res = await wrapped(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe('BANNED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('denies a role-forging user whose user_metadata claims ADMIN but app_metadata does not', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'u3',
          app_metadata: { role: 'TENANT', status: 'ACTIVE' },
          user_metadata: { role: 'ADMIN' },
        },
      },
    });

    const { withAuth } = await import('./withAuth');
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(['ADMIN'])(handler);
    const res = await wrapped(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe('WRONG_ROLE');
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const { withAuth } = await import('./withAuth');
    const handler = vi.fn();
    const wrapped = withAuth(['TENANT'])(handler);
    const res = await wrapped(makeRequest());

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
