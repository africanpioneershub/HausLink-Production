import { beforeEach, describe, expect, it, vi } from 'vitest';

const maintenanceFindUnique = vi.fn();
const maintenanceUpdate = vi.fn();
const userFindUnique = vi.fn();

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    maintenanceRequest: {
      findUnique: (...args: unknown[]) => maintenanceFindUnique(...args),
      update: (...args: unknown[]) => maintenanceUpdate(...args),
    },
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
  },
}));

const sendMaintenanceUpdateEmail = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/email/templates', () => ({
  sendMaintenanceUpdateEmail: (...args: unknown[]) => sendMaintenanceUpdateEmail(...args),
}));
const sendWhatsAppMaintenanceUpdate = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/whatsapp/templates', () => ({
  sendWhatsAppMaintenanceUpdate: (...args: unknown[]) => sendWhatsAppMaintenanceUpdate(...args),
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

function makeRequest(status: string) {
  return new Request('http://localhost/api/landlord/maintenance/req-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'test-token' },
    body: JSON.stringify({ status }),
  });
}

function makeMaintenanceRequest(overrides: { status?: string } = {}) {
  return {
    id: 'req-1',
    landlord_id: 'landlord-1',
    tenant_id: 'tenant-1',
    title: 'Leaking faucet',
    status: overrides.status ?? 'PENDING',
    resolved_at: null,
  };
}

describe('PATCH /api/landlord/maintenance/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'landlord-1', app_metadata: { role: 'LANDLORD', status: 'ACTIVE' } } },
    });
    userFindUnique.mockResolvedValue({ id: 'tenant-1', name: 'Jane', email: 'jane@example.com', whatsapp: null, phone: '+250788000000' });
  });

  it('notifies the tenant when the landlord resolves the request -- the gap this closes', async () => {
    // Previously nothing but the separate admin-only "assign" action ever
    // notified a tenant; this is the actual path every request normally
    // goes through, and it silently notified no one.
    maintenanceFindUnique.mockResolvedValue(makeMaintenanceRequest({ status: 'IN_PROGRESS' }));
    maintenanceUpdate.mockResolvedValue({ ...makeMaintenanceRequest(), status: 'RESOLVED' });

    const { PATCH } = await import('./route');
    const res = await PATCH(makeRequest('RESOLVED'), { params: { id: 'req-1' } });

    expect(res.status).toBe(200);
    expect(sendMaintenanceUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({ tenantEmail: 'jane@example.com', status: 'RESOLVED' })
    );
    expect(sendWhatsAppMaintenanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+250788000000', status: 'RESOLVED' })
    );
  });

  it('does not notify when the status does not actually change', async () => {
    maintenanceFindUnique.mockResolvedValue(makeMaintenanceRequest({ status: 'PENDING' }));
    maintenanceUpdate.mockResolvedValue({ ...makeMaintenanceRequest(), status: 'PENDING' });

    const { PATCH } = await import('./route');
    await PATCH(makeRequest('PENDING'), { params: { id: 'req-1' } });

    expect(sendMaintenanceUpdateEmail).not.toHaveBeenCalled();
    expect(sendWhatsAppMaintenanceUpdate).not.toHaveBeenCalled();
  });

  it('rejects a request belonging to a different landlord', async () => {
    maintenanceFindUnique.mockResolvedValue({ ...makeMaintenanceRequest(), landlord_id: 'someone-else' });

    const { PATCH } = await import('./route');
    const res = await PATCH(makeRequest('RESOLVED'), { params: { id: 'req-1' } });

    expect(res.status).toBe(404);
    expect(maintenanceUpdate).not.toHaveBeenCalled();
  });
});
