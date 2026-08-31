import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const billingAdd = vi.fn().mockResolvedValue({ id: 'billing-job' });
const disbursementAdd = vi.fn().mockResolvedValue({ id: 'disbursement-job' });
vi.mock('@/lib/bullmq/queues', () => ({
  billingQueue: { add: (...args: unknown[]) => billingAdd(...args) },
  disbursementQueue: { add: (...args: unknown[]) => disbursementAdd(...args) },
}));

const executeRaw = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/prisma/client', () => ({
  prisma: { $executeRaw: (...args: unknown[]) => executeRaw(...args) },
}));

describe('GET /api/jobs/trigger', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enqueues billing and disbursement jobs and completes fast when Redis is reachable (mocked)', async () => {
    const { GET } = await import('./route');
    const start = Date.now();

    const res = await GET(
      new Request('http://localhost/api/jobs/trigger', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(billingAdd).toHaveBeenCalledWith('GENERATE_MONTHLY_INVOICES', {
      trigger: 'GENERATE_MONTHLY_INVOICES',
    });
    expect(disbursementAdd).toHaveBeenCalledWith('PROCESS_PENDING_DISBURSEMENTS', {});
    // Nowhere near the 30s function timeout -- proves the request path
    // itself has no inherent slowness once Redis is actually reachable.
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('rejects requests with a bad or missing CRON_SECRET before touching the queues', async () => {
    const { GET } = await import('./route');

    const res = await GET(new Request('http://localhost/api/jobs/trigger'));

    expect(res.status).toBe(401);
    expect(billingAdd).not.toHaveBeenCalled();
    expect(disbursementAdd).not.toHaveBeenCalled();
  });
});
