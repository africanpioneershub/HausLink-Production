import { Queue } from 'bullmq';
import { bullmqConnection } from './connection';
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

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection: bullmqConnection,
});

export const billingQueue = new Queue(QUEUE_NAMES.BILLING, {
  connection: bullmqConnection,
});

export const disbursementQueue = new Queue(QUEUE_NAMES.DISBURSEMENT, {
  connection: bullmqConnection,
});
