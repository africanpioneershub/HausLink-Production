import { beforeEach, describe, expect, it, vi } from 'vitest';

// Deliberately does NOT mock @/lib/csrf -- this exercises the real
// generateCsrfToken/validateCsrfToken/getCookieValue wiring through
// withAuth, to prove the session-binding fix actually works end to end
// rather than just in csrf.ts's own unit tests.

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: (...args: unknown[]) => getUser(...args) } }),
}));
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true, getClientIp: () => '203.0.113.9' }));
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn().mockResolvedValue('1') } }));

function makeRequest(cookieToken: string | null, headerToken: string | null) {
  const headers: Record<string, string> = {};
  if (cookieToken) headers.cookie = `csrf_token=${encodeURIComponent(cookieToken)}`;
  if (headerToken) headers['x-csrf-token'] = headerToken;
  return new Request('http://localhost/api/test', { method: 'POST', headers });
}

describe('withAuth -- real CSRF wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CSRF_SECRET', 'test-secret-value');
  });

  it('allows a request whose cookie and header both carry a token minted for this exact user', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1', app_metadata: { role: 'TENANT', status: 'ACTIVE' } } },
    });

    const { generateCsrfToken } = await import('@/lib/csrf');
    const { withAuth } = await import('./withAuth');
    const token = generateCsrfToken('user-1');
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(['TENANT'])(handler);

    const res = await wrapped(makeRequest(token, token));

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects a token minted for a different user -- an attacker cannot reuse their own valid token against a victim session', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'victim-user', app_metadata: { role: 'TENANT', status: 'ACTIVE' } } },
    });

    const { generateCsrfToken } = await import('@/lib/csrf');
    const { withAuth } = await import('./withAuth');
    const attackersOwnToken = generateCsrfToken('attacker-user');
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(['TENANT'])(handler);

    const res = await wrapped(makeRequest(attackersOwnToken, attackersOwnToken));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe('CSRF_INVALID');
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects a header-only token with no matching cookie -- the double-submit check', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1', app_metadata: { role: 'TENANT', status: 'ACTIVE' } } },
    });

    const { generateCsrfToken } = await import('@/lib/csrf');
    const { withAuth } = await import('./withAuth');
    const token = generateCsrfToken('user-1');
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(['TENANT'])(handler);

    // No cookie set on this request at all -- only the header, as an
    // attacker able to set arbitrary headers (but not read/set the
    // victim's cookie) would be limited to.
    const res = await wrapped(makeRequest(null, token));

    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
