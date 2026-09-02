import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

function p2002(message: string) {
  return new Prisma.PrismaClientKnownRequestError(message, { code: 'P2002', clientVersion: 'test' });
}

const tenancyFindUnique = vi.fn();
const paymentFindFirst = vi.fn();
const paymentCreate = vi.fn();
const paymentUpdate = vi.fn().mockResolvedValue({});
const auditLogCreate = vi.fn().mockReturnValue({ catch: () => undefined });

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    tenancy: { findUnique: (...args: unknown[]) => tenancyFindUnique(...args) },
    payment: {
      findFirst: (...args: unknown[]) => paymentFindFirst(...args),
      create: (...args: unknown[]) => paymentCreate(...args),
      update: (...args: unknown[]) => paymentUpdate(...args),
    },
    auditLog: { create: (...args: unknown[]) => auditLogCreate(...args) },
  },
}));

vi.mock('@/lib/utils', () => ({ generateIdempotencyKey: () => 'idem-key-1' }));
vi.mock('@/lib/payments/momo', () => ({
  initiateMoMoPayment: vi.fn().mockResolvedValue({ transactionId: 'payment-1', status: 'PENDING' }),
}));
vi.mock('@/lib/payments/airtel', () => ({
  initiateAirtelPayment: vi.fn().mockResolvedValue({ transactionId: 'payment-1', status: 'PENDING' }),
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
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true, getClientIp: () => '203.0.113.9' }));
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn() } }));

function makeRequest() {
  return new Request('http://localhost/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-token' },
    body: JSON.stringify({ tenancyId: 'tenancy-1', method: 'MTN_MOMO', phoneNumber: '+250788000000' }),
  });
}

describe('POST /api/payments/initiate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'tenant-1', app_metadata: { role: 'TENANT', status: 'ACTIVE' } } },
    });
    tenancyFindUnique.mockResolvedValue({
      id: 'tenancy-1',
      tenant_id: 'tenant-1',
      landlord_id: 'landlord-1',
      rent_rwf: 100000,
      property: { title: 'Nice place' },
    });
    paymentFindFirst.mockResolvedValue(null);
  });

  it('creates a new pending payment when none exists', async () => {
    paymentCreate.mockResolvedValue({ id: 'payment-1' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.paymentId).toBe('payment-1');
    expect(paymentCreate).toHaveBeenCalledTimes(1);
  });

  it('returns the already-in-flight payment on a losing race, instead of erroring -- the unique-constraint fallback', async () => {
    // Reproduces the exact race this fix closes: the findFirst fast-path
    // check misses (another request's INSERT wasn't committed yet when
    // this one read), so both requests attempt to create a payment. The
    // database constraint lets exactly one through; this one's INSERT
    // hits the partial unique index and gets P2002. The route must
    // gracefully return the winner, not 500.
    paymentCreate.mockRejectedValue(p2002('Unique constraint failed'));
    paymentFindFirst
      .mockResolvedValueOnce(null) // the initial fast-path check
      .mockResolvedValueOnce({ id: 'payment-winner', method: 'MTN_MOMO', amount_rwf: 100000 }); // post-conflict lookup

    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.paymentId).toBe('payment-winner');
  });

  it('returns the existing pending payment directly when the fast-path check catches it', async () => {
    paymentFindFirst.mockResolvedValue({ id: 'payment-existing', method: 'MTN_MOMO', amount_rwf: 100000 });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.paymentId).toBe('payment-existing');
    expect(paymentCreate).not.toHaveBeenCalled();
  });
});
