import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

function p2025(message: string) {
  return new Prisma.PrismaClientKnownRequestError(message, { code: 'P2025', clientVersion: 'test' });
}

const applicationFindUnique = vi.fn();
const applicationUpdate = vi.fn();
const propertyUpdate = vi.fn();
const tenancyCreate = vi.fn();
const userFindUnique = vi.fn().mockResolvedValue(null);

function makeTx() {
  return {
    application: { update: (...args: unknown[]) => applicationUpdate(...args) },
    property: { update: (...args: unknown[]) => propertyUpdate(...args) },
    tenancy: { create: (...args: unknown[]) => tenancyCreate(...args) },
  };
}

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    application: {
      findUnique: (...args: unknown[]) => applicationFindUnique(...args),
    },
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(makeTx()),
  },
}));

vi.mock('@/lib/email/templates', () => ({
  sendApplicationStatusEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/whatsapp/templates', () => ({
  sendWhatsAppApplicationStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: () => true,
  getCookieValue: () => 'test-token',
  CSRF_COOKIE_NAME: 'csrf_token',
}));
vi.mock('@/lib/admin-guard', () => ({ isAdminIpAllowed: () => true }));
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn() } }));

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: (...args: unknown[]) => getUser(...args) } }),
}));

function makeApplication(overrides: { status?: string } = {}) {
  return {
    id: 'app-1',
    tenant_id: 'tenant-1',
    landlord_id: 'landlord-1',
    property_id: 'prop-1',
    status: overrides.status ?? 'PENDING',
    property: { id: 'prop-1', title: 'Nice place', rent_rwf: 100000, deposit_rwf: 100000, status: 'ACTIVE' },
  };
}

function makeRequest() {
  return new Request('http://localhost/api/landlord/applications/app-1/approve', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('POST /api/landlord/applications/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'landlord-1', app_metadata: { role: 'LANDLORD', status: 'ACTIVE' } } },
    });
  });

  it('approves a pending application on an available property', async () => {
    applicationFindUnique.mockResolvedValue(makeApplication());
    applicationUpdate.mockResolvedValue({ id: 'app-1', status: 'APPROVED' });
    propertyUpdate.mockResolvedValue({ id: 'prop-1', status: 'OCCUPIED' });
    tenancyCreate.mockResolvedValue({ id: 'tenancy-1' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'app-1' } });

    expect(res.status).toBe(200);
    expect(applicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'app-1', status: { in: ['PENDING', 'REVIEWING'] } } })
    );
    expect(propertyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prop-1', status: 'ACTIVE' } })
    );
    expect(tenancyCreate).toHaveBeenCalledTimes(1);
  });

  it('two concurrent approve calls for two different pending applications on the same property -- exactly one succeeds', async () => {
    // Simulates the real race: both requests pass the pre-transaction read
    // (application.status is still PENDING for both, property.status is
    // still ACTIVE), then both transactions attempt the conditional
    // property UPDATE. Under real Postgres, the second transaction's UPDATE
    // blocks on the row lock held by the first, then re-evaluates its WHERE
    // clause against the now-committed (OCCUPIED) row and finds no match --
    // Prisma surfaces that as P2025. This test asserts the route turns that
    // into a clean 409 rather than a second Tenancy record.
    const appA = makeApplication();
    const appB = { ...makeApplication(), id: 'app-2', tenant_id: 'tenant-2' };

    applicationFindUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === 'app-1' ? appA : appB)
    );
    applicationUpdate.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve({ id: args.where.id, status: 'APPROVED' })
    );
    // First property.update call (whichever request's transaction runs
    // first) succeeds; every subsequent call loses the race.
    let propertyUpdateCalls = 0;
    propertyUpdate.mockImplementation(() => {
      propertyUpdateCalls += 1;
      if (propertyUpdateCalls === 1) {
        return Promise.resolve({ id: 'prop-1', status: 'OCCUPIED' });
      }
      return Promise.reject(p2025('An operation failed because it depends on one or more records that were required but not found.'));
    });
    tenancyCreate.mockResolvedValue({ id: 'tenancy-1' });

    const { POST } = await import('./route');
    const [resA, resB] = await Promise.all([
      POST(makeRequest(), { params: { id: 'app-1' } }),
      POST(makeRequest(), { params: { id: 'app-2' } }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(tenancyCreate).toHaveBeenCalledTimes(1);

    const failed = resA.status === 409 ? resA : resB;
    const failedJson = await failed.json();
    expect(failedJson.code).toBe('PROPERTY_UNAVAILABLE');
  });

  it('returns 409 ALREADY_REVIEWED when the same application was approved a moment earlier', async () => {
    applicationFindUnique.mockResolvedValue(makeApplication());
    applicationUpdate.mockRejectedValue(p2025('Record not found'));

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'app-1' } });
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe('ALREADY_REVIEWED');
    expect(propertyUpdate).not.toHaveBeenCalled();
    expect(tenancyCreate).not.toHaveBeenCalled();
  });

  it('rejects an application belonging to a different landlord', async () => {
    applicationFindUnique.mockResolvedValue({ ...makeApplication(), landlord_id: 'someone-else' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'app-1' } });

    expect(res.status).toBe(404);
    expect(applicationUpdate).not.toHaveBeenCalled();
  });

  it('rejects an application that is not PENDING or REVIEWING', async () => {
    applicationFindUnique.mockResolvedValue(makeApplication({ status: 'WITHDRAWN' }));

    const { POST } = await import('./route');
    const res = await POST(makeRequest(), { params: { id: 'app-1' } });

    expect(res.status).toBe(400);
    expect(applicationUpdate).not.toHaveBeenCalled();
  });
});
