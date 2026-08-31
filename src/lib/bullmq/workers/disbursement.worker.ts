import { Worker, type Job } from 'bullmq';
import { getBullmqConnection } from '../connection';
import { QUEUE_NAMES, type DisbursementJobData } from '../queues';
import { prisma } from '@/lib/prisma/client';
import { disburseToLandlord } from '@/lib/payments/momo';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';

async function processLedgerEntry(ledgerEntryId: string) {
  const ledgerEntry = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerEntryId },
    include: { payment: { include: { landlord: { include: { preferences: true } } } } },
  });

  if (!ledgerEntry || ledgerEntry.disbursement_status !== 'PENDING') return;

  const landlord = ledgerEntry.payment.landlord;
  const phoneNumber = landlord.preferences?.payout_momo_number ?? landlord.phone;

  if (!phoneNumber) {
    console.error('[disbursement.worker] No payout phone number for landlord', landlord.id);
    await prisma.ledgerEntry.update({
      where: { id: ledgerEntry.id },
      data: { disbursement_status: 'FAILED' },
    });
    return;
  }

  const result = await disburseToLandlord({
    phoneNumber,
    amount: ledgerEntry.landlord_net_rwf,
    externalId: ledgerEntry.id,
    description: 'HausLink rent disbursement',
  });

  const newStatus = result.status === 'PENDING' ? 'COMPLETED' : 'FAILED';

  await prisma.ledgerEntry.update({
    where: { id: ledgerEntry.id },
    data: {
      disbursement_status: newStatus,
      disbursement_txn_ref: result.transactionId || undefined,
      disbursed_at: newStatus === 'COMPLETED' ? new Date() : undefined,
    },
  });

  if (newStatus === 'COMPLETED' && phoneNumber) {
    await sendWhatsAppMessage({
      to: phoneNumber,
      text: `Disbursement complete 💰\nRWF ${ledgerEntry.landlord_net_rwf.toLocaleString('en-US')} has been sent to your MoMo account.\nReference: ${result.transactionId}`,
    }).catch((error) => console.error('[disbursement.worker] Notification failed', error));
  }
}

async function processJob(job: Job) {
  const data = job.data as DisbursementJobData;
  if (data.ledgerEntryId) {
    await processLedgerEntry(data.ledgerEntryId);
    return;
  }

  const pendingEntries = await prisma.ledgerEntry.findMany({
    where: { disbursement_status: 'PENDING' },
    select: { id: true },
  });

  for (const entry of pendingEntries) {
    await processLedgerEntry(entry.id);
  }
}

export function startDisbursementWorker(): Worker {
  const worker = new Worker(QUEUE_NAMES.DISBURSEMENT, processJob, {
    connection: getBullmqConnection(),
  });

  worker.on('failed', (job, error) => {
    console.error('[disbursement.worker] Job failed', job?.id, error);
  });

  return worker;
}
