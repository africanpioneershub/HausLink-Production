import { Worker, type Job } from 'bullmq';
import { getBullmqConnection } from '../connection';
import { QUEUE_NAMES, type DisbursementJobData } from '../queues';
import { prisma } from '@/lib/prisma/client';
import { disburseToLandlord } from '@/lib/payments/momo';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';

// Exported for direct unit testing of the KYC gate below, without needing
// to spin up a real BullMQ Worker.
export async function processLedgerEntry(ledgerEntryId: string) {
  const ledgerEntry = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerEntryId },
    include: { payment: { include: { landlord: { include: { preferences: true } } } } },
  });

  if (!ledgerEntry || ledgerEntry.disbursement_status !== 'PENDING') return;

  // A payment flagged for refund (or otherwise moved off COMPLETED --
  // FAILED, REFUND_REQUESTED, REFUNDED) must never be paid out, even if its
  // ledger entry is still sitting PENDING. This is the actual money-risk
  // guard: the admin "flag for refund" action (see
  // api/admin/payments/[id]/refund) only ever changes Payment.status, not
  // this ledger entry, so without this check a refunded payment would still
  // disburse in full.
  if (ledgerEntry.payment.status !== 'COMPLETED') {
    console.error(
      '[disbursement.worker] Blocking disbursement -- payment is not COMPLETED',
      { paymentId: ledgerEntry.payment_id, paymentStatus: ledgerEntry.payment.status, ledgerEntryId: ledgerEntry.id }
    );
    await prisma.ledgerEntry.update({
      where: { id: ledgerEntry.id },
      data: { disbursement_status: 'FAILED' },
    });
    return;
  }

  const landlord = ledgerEntry.payment.landlord;

  // KYC is enforced here, at the point of actual financial risk, rather
  // than at registration (see docs/INCIDENT_LOG.md) -- a landlord can be
  // fully ACTIVE and list/manage properties without verified KYC, but must
  // never receive a payout without it. Fail loudly rather than silently
  // skip or silently pay out: this must never be a quiet no-op.
  if (landlord.kyc_status !== 'APPROVED') {
    console.error(
      '[disbursement.worker] Blocking disbursement -- landlord KYC not verified',
      { landlordId: landlord.id, kycStatus: landlord.kyc_status, ledgerEntryId: ledgerEntry.id }
    );
    await prisma.ledgerEntry.update({
      where: { id: ledgerEntry.id },
      data: { disbursement_status: 'FAILED' },
    });
    return;
  }

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
