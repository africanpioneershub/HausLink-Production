import { afterEach, describe, expect, it, vi } from 'vitest';

const ALL_REQUIRED_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'x',
  UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'x',
  CSRF_SECRET: 'x',
  CRON_SECRET: 'x',
  TOTP_ENCRYPTION_KEY: 'x',
  RESEND_API_KEY: 'x',
  REDIS_URL: 'redis://x:6379',
};

describe('env-check', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not throw in production when every required var, including REDIS_URL, is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const [key, value] of Object.entries(ALL_REQUIRED_VARS)) {
      vi.stubEnv(key, value);
    }
    await expect(import('./env-check')).resolves.toBeDefined();
  });

  it('throws with a REDIS_URL-specific explanation when only REDIS_URL is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const [key, value] of Object.entries(ALL_REQUIRED_VARS)) {
      if (key === 'REDIS_URL') continue;
      vi.stubEnv(key, value);
    }
    vi.stubEnv('REDIS_URL', '');

    let message = '';
    try {
      await import('./env-check');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/REDIS_URL/);
    expect(message).toMatch(/BullMQ/);
    expect(message).toMatch(/distinct from UPSTASH_REDIS_REST_URL/);
  });

  it('lists every missing var when several are unset', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('REDIS_URL', '');
    // Leave the rest unset too (default test env).

    let message = '';
    try {
      await import('./env-check');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/RESEND_API_KEY/);
    expect(message).toMatch(/REDIS_URL/);
  });

  it('does not throw outside production even if everything is missing', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    await expect(import('./env-check')).resolves.toBeDefined();
  });
});
