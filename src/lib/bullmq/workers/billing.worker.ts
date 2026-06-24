import { Worker, type Job } from 'bullmq';
import { bullmqConnection } from '../connection';
import { QUEUE_NAMES, type BillingJobData, notificationQueue } from '../queues';
import { prisma } from '@/lib/prisma/client';
import { generateIdempotencyKey, daysRemaining, formatDate } from '@/lib/utils';

const LEASE_EXPIRY_THRESHOLD_DAYS = 7;
const RENT_DUE_LEAD_DAYS = 7;

async function generateMonthlyInvoices() {
  const activeTenancies = await prisma.tenancy.findMany({
    where: { status: 'ACTIVE' },
    include: { property: true },
  });

  for (const tenancy of activeTenancies) {
    const existingPending = await prisma.payment.findFirst({
      where: { tenancy_id: tenancy.id, type: 'MONTHLY_RENT', status: 'PENDING' },
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + RENT_DUE_LEAD_DAYS);

    if (!existingPending) {
      await prisma.payment.create({
        data: {
          tenant_id: tenancy.tenant_id,
          landlord_id: tenancy.landlord_id,
          tenancy_id: tenancy.id,
          type: 'MONTHLY_RENT',
          status: 'PENDING',
          method: 'MTN_MOMO',
          amount_rwf: tenancy.rent_rwf,
          idempotency_key: generateIdempotencyKey(),
        },
      });

      await notificationQueue.add('RENT_DUE', {
        type: 'RENT_DUE',
        userId: tenancy.tenant_id,
        data: {
          propertyTitle: tenancy.property.title,
          amount: tenancy.rent_rwf,
          dueDate: formatDate(dueDate),
        },
      });
    }

    const remaining = daysRemaining(tenancy.end_date);
    if (remaining > 0 && remaining < LEASE_EXPIRY_THRESHOLD_DAYS) {
      await notificationQueue.add('LEASE_EXPIRY', {
        type: 'LEASE_EXPIRY',
        userId: tenancy.tenant_id,
        data: {
          propertyTitle: tenancy.property.title,
          daysRemaining: remaining,
          endDate: formatDate(tenancy.end_date),
        },
      });
    }
  }
}

async function processJob(job: Job) {
  const data = job.data as BillingJobData;
  if (data.trigger === 'GENERATE_MONTHLY_INVOICES') {
    await generateMonthlyInvoices();
  }
}

export function startBillingWorker(): Worker {
  const worker = new Worker(QUEUE_NAMES.BILLING, processJob, {
    connection: bullmqConnection,
  });

  worker.on('failed', (job, error) => {
    console.error('[billing.worker] Job failed', job?.id, error);
  });

  return worker;
}
