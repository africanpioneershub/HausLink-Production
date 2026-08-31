import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getBullmqConnection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws immediately when REDIS_URL is unset -- no localhost fallback, no network attempt', async () => {
    vi.stubEnv('REDIS_URL', '');
    const { getBullmqConnection } = await import('./connection');
    expect(() => getBullmqConnection()).toThrow(/REDIS_URL is not set/);
  });

  it('parses a redis:// URL without TLS', async () => {
    vi.stubEnv('REDIS_URL', 'redis://user:pass@example.com:6380');
    const { getBullmqConnection } = await import('./connection');
    const conn = getBullmqConnection() as {
      host: string;
      port: number;
      username?: string;
      password?: string;
      tls?: object;
    };
    expect(conn.host).toBe('example.com');
    expect(conn.port).toBe(6380);
    expect(conn.username).toBe('user');
    expect(conn.password).toBe('pass');
    expect(conn.tls).toBeUndefined();
  });

  it('parses a rediss:// URL with TLS enabled', async () => {
    vi.stubEnv('REDIS_URL', 'rediss://example.com:6379');
    const { getBullmqConnection } = await import('./connection');
    const conn = getBullmqConnection() as { tls?: object };
    expect(conn.tls).toEqual({});
  });
});
