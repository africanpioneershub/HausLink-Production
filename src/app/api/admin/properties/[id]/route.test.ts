import { beforeEach, describe, expect, it, vi } from 'vitest';

const propertyFindUnique = vi.fn();
const propertyUpdate = vi.fn().mockResolvedValue({});
const propertyDelete = vi.fn().mockResolvedValue({});
const propertyImageDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
const tenancyCount = vi.fn().mockResolvedValue(0);
const applicationCount = vi.fn().mockResolvedValue(0);

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    property: {
      findUnique: (...args: unknown[]) => propertyFindUnique(...args),
      update: (...args: unknown[]) => propertyUpdate(...args),
      delete: (...args: unknown[]) => propertyDelete(...args),
    },
    propertyImage: { deleteMany: (...args: unknown[]) => propertyImageDeleteMany(...args) },
    tenancy: { count: (...args: unknown[]) => tenancyCount(...args) },
    application: { count: (...args: unknown[]) => applicationCount(...args) },
  },
}));

vi.mock('@/lib/audit/logger', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/redis/cache', () => ({
  deleteCache: vi.fn().mockResolvedValue(undefined),
  deleteCachePattern: vi.fn().mockResolvedValue(undefined),
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
vi.mock('@/lib/redis/client', () => ({ redis: { get: vi.fn().mockResolvedValue('1') } }));

function makeRequest(query = '') {
  return new Request(`http://localhost/api/admin/properties/prop-1${query}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': 'test-token' },
  });
}

describe('DELETE /api/admin/properties/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'ADMIN', status: 'ACTIVE' } } },
    });
    propertyFindUnique.mockResolvedValue({ id: 'prop-1', status: 'ACTIVE' });
    tenancyCount.mockResolvedValue(0);
    applicationCount.mockResolvedValue(0);
  });

  it('defaults to a soft-delete -- flips status, never touches Tenancy/Application/PropertyImage rows', async () => {
    const { DELETE } = await import('./route');
    const res = await DELETE(makeRequest(), { params: { id: 'prop-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.hard).toBe(false);
    expect(propertyUpdate).toHaveBeenCalledWith({ where: { id: 'prop-1' }, data: { status: 'DELETED' } });
    expect(propertyDelete).not.toHaveBeenCalled();
    expect(propertyImageDeleteMany).not.toHaveBeenCalled();
    // The guard is only for the hard-delete path -- soft-delete is
    // non-destructive regardless of history, so it must never even query it.
    expect(tenancyCount).not.toHaveBeenCalled();
    expect(applicationCount).not.toHaveBeenCalled();
  });

  it('refuses a hard delete when an active tenancy exists', async () => {
    tenancyCount.mockResolvedValue(1);

    const { DELETE } = await import('./route');
    const res = await DELETE(makeRequest('?hard=true'), { params: { id: 'prop-1' } });
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe('ACTIVE_TENANCY_EXISTS');
    expect(propertyDelete).not.toHaveBeenCalled();
    expect(propertyImageDeleteMany).not.toHaveBeenCalled();
  });

  it('refuses a hard delete when a pending or reviewing application exists', async () => {
    applicationCount.mockResolvedValue(1);

    const { DELETE } = await import('./route');
    const res = await DELETE(makeRequest('?hard=true'), { params: { id: 'prop-1' } });
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe('OPEN_APPLICATIONS_EXIST');
    expect(propertyDelete).not.toHaveBeenCalled();
  });

  it('allows a hard delete once the guard confirms zero active tenancies and zero open applications', async () => {
    const { DELETE } = await import('./route');
    const res = await DELETE(makeRequest('?hard=true'), { params: { id: 'prop-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.hard).toBe(true);
    expect(propertyImageDeleteMany).toHaveBeenCalledWith({ where: { property_id: 'prop-1' } });
    expect(propertyDelete).toHaveBeenCalledWith({ where: { id: 'prop-1' } });
  });

  it('404s for a property that does not exist', async () => {
    propertyFindUnique.mockResolvedValue(null);

    const { DELETE } = await import('./route');
    const res = await DELETE(makeRequest('?hard=true'), { params: { id: 'prop-1' } });

    expect(res.status).toBe(404);
    expect(propertyDelete).not.toHaveBeenCalled();
    expect(propertyUpdate).not.toHaveBeenCalled();
  });
});
