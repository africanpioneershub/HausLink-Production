import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('BullMQ queues -- lazy connection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('bullmq');
  });

  it('importing the module never throws or attempts a connection, even with REDIS_URL unset', async () => {
    vi.stubEnv('REDIS_URL', '');
    await expect(import('./queues')).resolves.toBeDefined();
  });

  it('calling .add() with REDIS_URL unset throws immediately with a clear error -- not a 30s hang against 127.0.0.1', async () => {
    vi.stubEnv('REDIS_URL', '');
    const { notificationQueue } = await import('./queues');

    const start = Date.now();
    // Throws synchronously (the lazy Proxy resolves the real Queue, which
    // reads REDIS_URL, as soon as `.add` is accessed) -- never returns a
    // pending promise that could hang waiting on a network call.
    expect(() => notificationQueue.add('X', {})).toThrow(/REDIS_URL is not set/);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('with REDIS_URL set, the queue is constructed once with the parsed connection and .add() reaches it', async () => {
    vi.stubEnv('REDIS_URL', 'redis://example.com:6379');

    const addMock = vi.fn().mockResolvedValue({ id: 'job-1' });
    const QueueMock = vi.fn(function QueueMock() {
      return { add: addMock };
    });
    vi.doMock('bullmq', () => ({ Queue: QueueMock }));

    const { notificationQueue, billingQueue } = await import('./queues');

    await notificationQueue.add('RENT_DUE', { foo: 'bar' });
    // A second queue must not share the first queue's lazily-constructed
    // instance or connection.
    await billingQueue.add('GENERATE_MONTHLY_INVOICES', {});

    expect(QueueMock).toHaveBeenCalledTimes(2);
    const [, options] = QueueMock.mock.calls[0] as unknown as [string, { connection: unknown }];
    expect(options.connection).toMatchObject({ host: 'example.com', port: 6379 });
    expect(addMock).toHaveBeenCalledWith('RENT_DUE', { foo: 'bar' });
  });
});
