import { Queue } from 'bullmq';
import { getBullmqConnection } from './connection';
import type { NotificationType } from '@/lib/notifications/sender';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  BILLING: 'billing',
  DISBURSEMENT: 'disbursement',
} as const;

export interface NotificationJobData {
  type: NotificationType | 'PAYMENT_CONFIRMED';
  userId?: string;
  data: Record<string, any>;
}

export interface BillingJobData {
  trigger: 'GENERATE_MONTHLY_INVOICES';
}

export interface DisbursementJobData {
  ledgerEntryId?: string;
}

// Lazily constructed so importing this module (e.g. during Next.js build-time
// page data collection, or a cold serverless start before any job is
// actually enqueued) never attempts a Redis connection. The connection --
// and any missing-REDIS_URL error -- only happens on first real use
// (e.g. queue.add()), inside a request/job, not at import time.
function createLazyQueue(name: string): Queue {
  let queue: Queue | undefined;
  function getQueue(): Queue {
    if (!queue) {
      queue = new Queue(name, { connection: getBullmqConnection() });
    }
    return queue;
  }
  return new Proxy({} as Queue, {
    get(_target, prop, receiver) {
      return Reflect.get(getQueue(), prop, receiver);
    },
  });
}

export const notificationQueue = createLazyQueue(QUEUE_NAMES.NOTIFICATIONS);
export const billingQueue = createLazyQueue(QUEUE_NAMES.BILLING);
export const disbursementQueue = createLazyQueue(QUEUE_NAMES.DISBURSEMENT);
