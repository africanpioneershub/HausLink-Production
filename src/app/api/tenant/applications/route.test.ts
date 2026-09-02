import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFindUnique = vi.fn();
const propertyFindUnique = vi.fn();
const applicationFindFirst = vi.fn();
const applicationCreate = vi.fn();
const auditLogCreate = vi.fn().mockReturnValue({ catch: () => undefined });

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    property: { findUnique: (...args: unknown[]) => propertyFindUnique(...args) },
    application: {
      findFirst: (...args: unknown[]) => applicationFindFirst(...args),
      create: (...args: unknown[]) => applicationCreate(...args),
    },
    auditLog: { create: (...args: unknown[]) => auditLogCreate(...args) },
  },
}));

vi.mock('@/lib/email/templates', () => ({ sendNewApplicationEmail: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/whatsapp/templates', () => ({ sendWhatsAppNewApplication: vi.fn().mockResolvedValue(undefined) }));

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

function makeRequest(propertyId = 'prop-1') {
  return new Request('http://localhost/api/tenant/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-token' },
    body: JSON.stringify({ property_id: propertyId }),
  });
}

describe('POST /api/tenant/applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'tenant-1', app_metadata: { role: 'TENANT', status: 'ACTIVE' } } },
    });
    propertyFindUnique.mockResolvedValue({ id: 'prop-1', status: 'ACTIVE', landlord_id: 'landlord-1', title: 'Nice place' });
    applicationFindFirst.mockResolvedValue(null);
    applicationCreate.mockResolvedValue({ id: 'app-1' });
  });

  it('rejects a tenant whose KYC is not APPROVED -- the direct-POST bypass this closes', async () => {
    // The "Apply" button only hides client-side for unverified tenants; a
    // direct POST previously succeeded regardless. Mirrors the same
    // server-side re-check landlord property creation already does.
    userFindUnique.mockResolvedValue({ id: 'tenant-1', kyc_status: 'NOT_SUBMITTED' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe('KYC_REQUIRED');
    expect(applicationCreate).not.toHaveBeenCalled();
  });

  it('rejects a tenant with PENDING (submitted but not yet reviewed) KYC the same way', async () => {
    userFindUnique.mockResolvedValue({ id: 'tenant-1', kyc_status: 'PENDING' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(applicationCreate).not.toHaveBeenCalled();
  });

  it('allows a tenant with APPROVED KYC to apply', async () => {
    userFindUnique.mockResolvedValue({ id: 'tenant-1', kyc_status: 'APPROVED', name: 'Jane', email: 'jane@example.com' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(201);
    expect(applicationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: 'tenant-1', property_id: 'prop-1' }) })
    );
  });
});
