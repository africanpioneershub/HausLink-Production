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
vi.mock('@/lib/email/templates', () => ({ sendKYCApprovedEmail: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/whatsapp/templates', () => ({ sendWhatsAppKYCApproved: vi.fn().mockResolvedValue(undefined) }));

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

function makeRequest() {
  return new Request('http://localhost/api/admin/kyc/user-1/approve', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('POST /api/admin/kyc/[userId]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
    userFindUnique.mockResolvedValue({ id: 'user-1', name: 'Jane', email: 'jane@example.com', whatsapp: null, phone: null });
  });

  it('approves a user with a genuinely PENDING kyc_status', async () => {
    userUpdateMany.mockResolvedValue({ count: 1 });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { userId: 'user-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.kyc_status).toBe('APPROVED');
    expect(userUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', kyc_status: 'PENDING' },
      data: { kyc_status: 'APPROVED' },
    });
    expect(kycDocUpdateMany).toHaveBeenCalledTimes(1);
    expect(updateAppMetadata).toHaveBeenCalledWith('user-1', { kyc_status: 'APPROVED' });
  });

  it('rejects approving a user who never had a pending review -- the direct-API bypass this closes', async () => {
    // Reproduces the exact gap: previously nothing but the admin UI's
    // conditional rendering stopped a NOT_SUBMITTED (or already-decided)
    // user from being marked APPROVED via a direct API call.
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
