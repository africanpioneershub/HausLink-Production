import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';

vi.mock('@/lib/redis/ratelimit', () => ({
  authRateLimit: {},
  applyRateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
}));

const resend = vi.fn();
vi.mock('@/lib/supabase/publicAuth', () => ({
  supabasePublicAuth: { auth: { resend: (...args: unknown[]) => resend(...args) } },
}));

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.resend with type signup and reports success', async () => {
    resend.mockResolvedValue({ error: null });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'stuck@example.com' }),
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(resend).toHaveBeenCalledTimes(1);
    const [args] = resend.mock.calls[0];
    expect(args.type).toBe('signup');
    expect(args.email).toBe('stuck@example.com');
  });

  it('does not report success when Supabase returns an error', async () => {
    resend.mockResolvedValue({ error: { message: 'boom' } });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'stuck@example.com' }),
      })
    );

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('RESEND_FAILED');
  });

  it('retries a transient AuthRetryableFetchError and succeeds on the next attempt', async () => {
    resend
      .mockResolvedValueOnce({ error: new AuthRetryableFetchError('{}', 500) })
      .mockResolvedValueOnce({ error: null });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'stuck@example.com' }),
      })
    );

    expect(res.status).toBe(200);
    expect(resend).toHaveBeenCalledTimes(2);
  }, 10000);

  it('rejects an invalid email without calling Supabase', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })
    );

    expect(res.status).toBe(400);
    expect(resend).not.toHaveBeenCalled();
  });
});
