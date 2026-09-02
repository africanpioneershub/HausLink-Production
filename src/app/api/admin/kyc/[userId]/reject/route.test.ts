import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFindUnique = vi.fn();
const userUpdateMany = vi.fn();
const kycDocUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

function makeTx() {
  return {
    user: { updateMany: (...args: unknown[]) => userUpdateMany(...args) },
    kYCDocument: { updateMany: (...args: unknown[]) => kycDocUpdateMany(...args) },
  };
}

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(makeTx()),
  },
}));

const updateAppMetadata = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/supabase/admin', () => ({ updateAppMetadata: (...args: unknown[]) => updateAppMetadata(...args) }));

vi.mock('@/lib/audit/logger', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/redis/cache', () => ({
  deleteCache: vi.fn().mockResolvedValue(undefined),
  CACHE_KEYS: { userProfile: (id: string) => `user:profile:${id}` },
}));
vi.mock('@/lib/email/templates', () => ({ sendKYCRejectedEmail: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/whatsapp/templates', () => ({ sendWhatsAppKYCRejected: vi.fn().mockResolvedValue(undefined) }));

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

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/admin/kyc/user-1/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-token' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/kyc/[userId]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
    userFindUnique.mockResolvedValue({ id: 'user-1', name: 'Jane', email: 'jane@example.com', whatsapp: null, phone: null });
  });

  it('rejects a user with a genuinely PENDING kyc_status', async () => {
    userUpdateMany.mockResolvedValue({ count: 1 });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ reason: 'Blurry document' }), { params: { userId: 'user-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.kyc_status).toBe('REJECTED');
    expect(userUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', kyc_status: 'PENDING' },
      data: { kyc_status: 'REJECTED' },
    });
    expect(updateAppMetadata).toHaveBeenCalledWith('user-1', { kyc_status: 'REJECTED' });
  });

  it('rejects rejecting a user who never had a pending review -- same server-side precondition as approve', async () => {
    userUpdateMany.mockResolvedValue({ count: 0 });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { userId: 'user-1' } });
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe('NOT_PENDING');
    expect(kycDocUpdateMany).not.toHaveBeenCalled();
    expect(updateAppMetadata).not.toHaveBeenCalled();
  });

  it('404s for a user that does not exist', async () => {
    userFindUnique.mockResolvedValue(null);

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { userId: 'user-1' } });

    expect(res.status).toBe(404);
    expect(userUpdateMany).not.toHaveBeenCalled();
  });
});
