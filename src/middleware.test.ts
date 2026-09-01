import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
  })),
}));

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`);
}

describe('middleware -- account activation gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('lets a TENANT straight into /tenant/dashboard with no PENDING redirect -- the removed gate', async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: 'u1', user_metadata: { role: 'TENANT', status: 'PENDING' } },
      },
    });

    const { middleware } = await import('./middleware');
    const res = await middleware(makeRequest('/tenant/dashboard'));

    // Even a still-PENDING status (e.g. activation sync hasn't landed yet)
    // must not redirect to /onboarding/account-pending anymore -- that
    // gate is gone. Absence of a redirect Location header means
    // NextResponse.next() was returned, not NextResponse.redirect().
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets a LANDLORD with paid registration straight into /landlord/dashboard', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'u2',
          user_metadata: { role: 'LANDLORD', status: 'ACTIVE', kyc_status: 'APPROVED', registration_paid: true },
        },
      },
    });

    const { middleware } = await import('./middleware');
    const res = await middleware(makeRequest('/landlord/dashboard'));

    expect(res.headers.get('location')).toBeNull();
  });

  it('still redirects an unauthenticated request to /unauthorized -- unrelated check untouched', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const { middleware } = await import('./middleware');
    const res = await middleware(makeRequest('/tenant/dashboard'));

    expect(res.headers.get('location')).toContain('/unauthorized');
  });

  it('still redirects a BANNED user to /unauthorized -- unrelated check untouched', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u3', user_metadata: { role: 'TENANT', status: 'BANNED' } } },
    });

    const { middleware } = await import('./middleware');
    const res = await middleware(makeRequest('/tenant/dashboard'));

    expect(res.headers.get('location')).toContain('/unauthorized');
  });

  it('still redirects a wrong-role user to /unauthorized -- unrelated check untouched', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u4', user_metadata: { role: 'LANDLORD', status: 'ACTIVE' } } },
    });

    const { middleware } = await import('./middleware');
    const res = await middleware(makeRequest('/tenant/dashboard'));

    expect(res.headers.get('location')).toContain('/unauthorized');
  });

  it('still redirects a LANDLORD with approved KYC but unpaid registration to /onboarding/payment-required -- REGISTRATION_PAID gate untouched', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'u5',
          user_metadata: { role: 'LANDLORD', status: 'ACTIVE', kyc_status: 'APPROVED', registration_paid: false },
        },
      },
    });

    const { middleware } = await import('./middleware');
    const res = await middleware(makeRequest('/landlord/properties'));

    expect(res.headers.get('location')).toContain('/onboarding/payment-required');
  });
});
