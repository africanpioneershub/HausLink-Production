import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const notificationGetCounts = vi.fn();
const billingGetCounts = vi.fn();
const disbursementGetCounts = vi.fn();

vi.mock('@/lib/bullmq/queues', () => ({
  QUEUE_NAMES: { NOTIFICATIONS: 'notifications', BILLING: 'billing', DISBURSEMENT: 'disbursement' },
  notificationQueue: { getJobCounts: (...args: unknown[]) => notificationGetCounts(...args) },
  billingQueue: { getJobCounts: (...args: unknown[]) => billingGetCounts(...args) },
  disbursementQueue: { getJobCounts: (...args: unknown[]) => disbursementGetCounts(...args) },
}));

describe('GET /api/jobs/queue-health', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.clearAllMocks();
    notificationGetCounts.mockResolvedValue({ waiting: 0, active: 0 });
    billingGetCounts.mockResolvedValue({ waiting: 0, active: 0 });
    disbursementGetCounts.mockResolvedValue({ waiting: 0, active: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 200 and success when every queue is under its threshold', async () => {
    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/jobs/queue-health', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.queues).toHaveLength(3);
  });

  it('logs an ERROR-level line and returns 503 when a queue backlog exceeds its threshold', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    billingGetCounts.mockResolvedValue({ waiting: 50, active: 0 }); // way over the billing threshold of 2

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/jobs/queue-health', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.success).toBe(false);
    const billingResult = json.data.queues.find((q: { name: string }) => q.name === 'billing');
    expect(billingResult.backlogged).toBe(true);
    expect(billingResult.waiting).toBe(50);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[queue-health]'),
      expect.objectContaining({ name: 'billing', waiting: 50 })
    );

    errorSpy.mockRestore();
  });

  it('logs and returns 503 (not a thrown 500) when a queue is unreachable, and still checks the others', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    disbursementGetCounts.mockRejectedValue(new Error('REDIS_URL is not set'));

    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/jobs/queue-health', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    const disbursementResult = json.data.queues.find((q: { name: string }) => q.name === 'disbursement');
    expect(disbursementResult.error).toMatch(/REDIS_URL/);
    // The other two queues were still checked despite one failing.
    expect(notificationGetCounts).toHaveBeenCalled();
    expect(billingGetCounts).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[queue-health]'),
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });

  it('rejects requests with a bad or missing CRON_SECRET before touching any queue', async () => {
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/jobs/queue-health'));

    expect(res.status).toBe(401);
    expect(notificationGetCounts).not.toHaveBeenCalled();
    expect(billingGetCounts).not.toHaveBeenCalled();
    expect(disbursementGetCounts).not.toHaveBeenCalled();
  });
});
