import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/redis/ratelimit', () => ({
  authRateLimit: {},
  applyRateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
}));

vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const signUp = vi.fn();
vi.mock('@/lib/supabase/publicAuth', () => ({
  supabasePublicAuth: { auth: { signUp: (...args: unknown[]) => signUp(...args) } },
}));

const createUser = vi.fn();
const deleteUser = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { auth: { admin: { createUser: (...args: unknown[]) => createUser(...args), deleteUser: (...args: unknown[]) => deleteUser(...args) } } },
}));

vi.mock('@/lib/email/templates', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/whatsapp/templates', () => ({
  sendWhatsAppWelcome: vi.fn().mockResolvedValue(undefined),
}));

const validPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
  role: 'TENANT',
  phone: '788123456',
  whatsapp: '788123456',
  district: 'Gasabo',
  countryCode: '+250',
  whatsappCountryCode: '+250',
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.signUp (not admin.createUser) so a confirmation email is actually sent', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(signUp).toHaveBeenCalledTimes(1);
    const [args] = signUp.mock.calls[0];
    expect(args.email).toBe(validPayload.email);
    expect(args.options.emailRedirectTo).toBe('https://hauselink.com/auth/confirm');

    // Regression guard: admin.createUser() never sends a confirmation email,
    // so registration must not use it to create the auth user.
    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns an error instead of a fake success when signUp fails', async () => {
    signUp.mockResolvedValue({ data: { user: null }, error: { message: 'Email already registered' } });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('AUTH_ERROR');
  });
});
