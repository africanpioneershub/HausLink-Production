import { beforeEach, describe, expect, it, vi } from 'vitest';

const ledgerFindUnique = vi.fn();
const ledgerUpdateMany = vi.fn();
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    ledgerEntry: {
      findUnique: (...args: unknown[]) => ledgerFindUnique(...args),
      updateMany: (...args: unknown[]) => ledgerUpdateMany(...args),
    },
  },
}));

const queueAdd = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/bullmq/queues', () => ({
  disbursementQueue: { add: (...args: unknown[]) => queueAdd(...args) },
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
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true, getClientIp: () => '203.0.113.9' }));
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn().mockResolvedValue('1') } }));

function makeRequest() {
  return new Request('http://localhost/api/admin/payments/payment-1/retry-disbursement', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('POST /api/admin/payments/[id]/retry-disbursement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
  });

  it('resets a FAILED disbursement to PENDING and enqueues it for the worker', async () => {
    ledgerFindUnique.mockResolvedValue({ id: 'ledger-1', payment_id: 'payment-1', disbursement_status: 'FAILED' });
    ledgerUpdateMany.mockResolvedValue({ count: 1 });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'payment-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.disbursement_status).toBe('PENDING');
    expect(ledgerUpdateMany).toHaveBeenCalledWith({
      where: { id: 'ledger-1', disbursement_status: 'FAILED' },
      data: { disbursement_status: 'PENDING' },
    });
    expect(queueAdd).toHaveBeenCalledWith('RETRY_DISBURSEMENT', { ledgerEntryId: 'ledger-1' });
  });

  it('refuses to retry a disbursement that is not FAILED', async () => {
    ledgerFindUnique.mockResolvedValue({ id: 'ledger-1', payment_id: 'payment-1', disbursement_status: 'COMPLETED' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'payment-1' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('NOT_FAILED');
    expect(ledgerUpdateMany).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('404s when the payment has no ledger entry at all', async () => {
    ledgerFindUnique.mockResolvedValue(null);

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'payment-1' } });

    expect(res.status).toBe(404);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('handles losing a race against another retry request', async () => {
    ledgerFindUnique.mockResolvedValue({ id: 'ledger-1', payment_id: 'payment-1', disbursement_status: 'FAILED' });
    ledgerUpdateMany.mockResolvedValue({ count: 0 });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'payment-1' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('NOT_FAILED');
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
