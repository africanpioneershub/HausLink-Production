import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { getBullmqConnection } from '../connection';
import { QUEUE_NAMES, type NotificationJobData } from '../queues';
import { sendNotification } from '@/lib/notifications/sender';
import { sendRentPaidEmail } from '@/lib/email/templates';
import { sendWhatsAppRentPaid } from '@/lib/whatsapp/templates';

async function processPaymentConfirmed(data: Record<string, any>) {
  const { tenant, landlord, propertyTitle, grossAmount, netAmount, transactionRef } = data;

  await sendRentPaidEmail({
    tenantName: tenant.name ?? 'there',
    tenantEmail: tenant.email,
    landlordName: landlord.name ?? 'there',
    landlordEmail: landlord.email,
    propertyTitle,
    amount: grossAmount,
    transactionRef,
  });

  if (tenant.phone) {
    await sendWhatsAppRentPaid({
      phone: tenant.phone,
      name: tenant.name ?? 'there',
      propertyTitle,
      amount: grossAmount,
      transactionRef,
      recipientType: 'TENANT',
    });
  }

  if (landlord.phone) {
    await sendWhatsAppRentPaid({
      phone: landlord.phone,
      name: landlord.name ?? 'there',
      propertyTitle,
      amount: netAmount,
      transactionRef,
      recipientType: 'LANDLORD',
    });
  }
}

async function processJob(job: Job) {
  const { type, userId, data } = job.data as NotificationJobData;

  if (type === 'PAYMENT_CONFIRMED') {
    await processPaymentConfirmed(data);
    return;
  }

  if (!userId) {
    console.error('[notification.worker] Missing userId for notification type', type);
    return;
  }

  await sendNotification({ userId, type, data });
}

export function startNotificationWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    processJob,
    { connection: getBullmqConnection() }
  );

  worker.on('failed', (job, error) => {
    console.error('[notification.worker] Job failed', job?.id, error);
  });

  return worker;
}
