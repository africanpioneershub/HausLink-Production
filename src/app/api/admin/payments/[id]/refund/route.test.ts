import { beforeEach, describe, expect, it, vi } from 'vitest';

const paymentFindUnique = vi.fn();
const paymentUpdate = vi.fn();
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    payment: {
      findUnique: (...args: unknown[]) => paymentFindUnique(...args),
      update: (...args: unknown[]) => paymentUpdate(...args),
    },
  },
}));

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
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn().mockResolvedValue('1') } }));

function makeRequest() {
  return new Request('http://localhost/api/admin/payments/payment-1/refund', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('POST /api/admin/payments/[id]/refund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
  });

  it('flags a completed payment as REFUND_REQUESTED -- never claims REFUNDED, since no reversal actually happens', async () => {
    // This is the fix: the action must never imply money moved when it
    // didn't. REFUNDED is reserved for when a real provider reversal
    // exists.
    paymentFindUnique.mockResolvedValue({ id: 'payment-1', status: 'COMPLETED' });
    paymentUpdate.mockResolvedValue({ id: 'payment-1', status: 'REFUND_REQUESTED' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'payment-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: 'payment-1' }, data: { status: 'REFUND_REQUESTED' } });
    expect(json.data.status).toBe('REFUND_REQUESTED');
  });

  it('refuses to flag a payment that is not COMPLETED', async () => {
    paymentFindUnique.mockResolvedValue({ id: 'payment-1', status: 'PENDING' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'payment-1' } });

    expect(res.status).toBe(400);
    expect(paymentUpdate).not.toHaveBeenCalled();
  });
});
