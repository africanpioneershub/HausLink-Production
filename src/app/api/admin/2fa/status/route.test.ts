import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFindUnique = vi.fn();
vi.mock('@/lib/prisma/client', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => userFindUnique(...args) } },
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
  return new Request('http://localhost/api/admin/2fa/status', { method: 'GET' });
}

describe('GET /api/admin/2fa/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
  });

  it('reports enrolled: false for an admin who has never confirmed enrollment', async () => {
    userFindUnique.mockResolvedValue({ totp_enrolled_at: null });

    const { GET } = await import('./route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.data.enrolled).toBe(false);
  });

  it('reports enrolled: true once totp_enrolled_at is set', async () => {
    userFindUnique.mockResolvedValue({ totp_enrolled_at: new Date() });

    const { GET } = await import('./route');
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.data.enrolled).toBe(true);
  });

  it('reaches the handler even without a 2FA-verified Redis session -- this route is itself part of the bootstrap ceremony', async () => {
    // Reproduces the chicken-and-egg fix in withAuth.ts: this route must be
    // exempt from the TWO_FA_VERIFIED-session check, or an unenrolled admin
    // could never reach it to find out they need to enroll.
    userFindUnique.mockResolvedValue({ totp_enrolled_at: null });

    const { GET } = await import('./route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
  });
});
