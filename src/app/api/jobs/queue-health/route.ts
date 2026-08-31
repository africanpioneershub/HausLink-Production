import { NextResponse } from 'next/server';
import { notificationQueue, billingQueue, disbursementQueue, QUEUE_NAMES } from '@/lib/bullmq/queues';
import type { Queue } from 'bullmq';

export const dynamic = 'force-dynamic';

// Conservative starting thresholds for jobs sitting in "waiting" -- past
// this, it's a signal the consuming Worker process (npm run worker /
// src/worker.ts) is down, unhosted, or has fallen behind, not normal
// traffic variance. Tune these once real production job volume is known.
// See docs/INCIDENT_LOG.md for why an unprocessed queue must never again
// fail silently.
const WAITING_THRESHOLDS: Record<string, number> = {
  [QUEUE_NAMES.BILLING]: 2, // the daily cron enqueues ~1 job/day
  [QUEUE_NAMES.DISBURSEMENT]: 20,
  [QUEUE_NAMES.NOTIFICATIONS]: 50,
};

const QUEUES: Array<{ name: string; queue: Queue }> = [
  { name: QUEUE_NAMES.NOTIFICATIONS, queue: notificationQueue },
  { name: QUEUE_NAMES.BILLING, queue: billingQueue },
  { name: QUEUE_NAMES.DISBURSEMENT, queue: disbursementQueue },
];

interface QueueHealth {
  name: string;
  waiting: number | null;
  active: number | null;
  threshold: number;
  backlogged: boolean;
  error: string | null;
}

async function checkQueue(name: string, queue: Queue): Promise<QueueHealth> {
  const threshold = WAITING_THRESHOLDS[name] ?? 10;

  try {
    const counts = await queue.getJobCounts('waiting', 'active');
    const waiting = counts.waiting ?? 0;
    const active = counts.active ?? 0;
    const backlogged = waiting > threshold;

    if (backlogged) {
      console.error(
        `[queue-health] Queue "${name}" has ${waiting} waiting jobs ` +
          `(threshold ${threshold}) -- the worker process may be down, ` +
          'unhosted, or has fallen behind. See docs/INCIDENT_LOG.md.',
        { name, waiting, active, threshold }
      );
    }

    return { name, waiting, active, threshold, backlogged, error: null };
  } catch (error) {
    console.error(`[queue-health] Failed to read job counts for queue "${name}"`, error);
    return {
      name,
      waiting: null,
      active: null,
      threshold,
      backlogged: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error('[queue-health] CRON_SECRET not configured - rejecting all requests');
    return NextResponse.json(
      { success: false, error: 'Server misconfigured', code: 'MISCONFIGURED' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const results = await Promise.all(QUEUES.map(({ name, queue }) => checkQueue(name, queue)));
  const unhealthy = results.some((r) => r.backlogged || r.error);

  return NextResponse.json(
    { success: !unhealthy, data: { queues: results } },
    { status: unhealthy ? 503 : 200 }
  );
}
