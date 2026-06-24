import { startNotificationWorker } from '@/lib/bullmq/workers/notification.worker';
import { startBillingWorker } from '@/lib/bullmq/workers/billing.worker';
import { startDisbursementWorker } from '@/lib/bullmq/workers/disbursement.worker';

const notificationWorker = startNotificationWorker();
const billingWorker = startBillingWorker();
const disbursementWorker = startDisbursementWorker();

console.log('[worker] Notification, billing, and disbursement workers started');

async function shutdown(signal: string) {
  console.log(`[worker] Received ${signal}, shutting down gracefully…`);
  await Promise.all([
    notificationWorker.close(),
    billingWorker.close(),
    disbursementWorker.close(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
