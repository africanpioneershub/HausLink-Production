import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './fetchWithTimeout';

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('resolves normally when the underlying fetch responds before the timeout', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('ok'));

    const res = await fetchWithTimeout('https://example.com', {}, 5000);

    expect(res.status).toBe(200);
  });

  it('aborts and rejects once the timeout elapses -- the exact hang this closes', async () => {
    // Reproduces the original gap: MoMo/Airtel calls had no timeout at
    // all, so a hanging provider response blocked the request
    // indefinitely (bounded only by Vercel's own 30s function limit).
    vi.useFakeTimers();
    global.fetch = vi.fn((_url: string, options?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    }) as unknown as typeof fetch;

    const promise = fetchWithTimeout('https://example.com', {}, 1000);
    const assertion = expect(promise).rejects.toThrow(/aborted/i);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('passes the abort signal through to fetch so the underlying request is actually cancelled', async () => {
    let capturedSignal: AbortSignal | undefined;
    global.fetch = vi.fn((_url: string, options?: RequestInit) => {
      capturedSignal = options?.signal ?? undefined;
      return Promise.resolve(new Response('ok'));
    }) as unknown as typeof fetch;

    await fetchWithTimeout('https://example.com', {}, 5000);

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });
});
