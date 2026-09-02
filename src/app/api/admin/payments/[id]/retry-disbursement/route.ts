import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { getClientIp } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { disbursementQueue } from '@/lib/bullmq/queues';

// A FAILED disbursement was previously terminal -- disbursement.worker.ts
// only ever sweeps disbursement_status: 'PENDING', so nothing ever looked
// at a FAILED entry again (transient provider outage, missing phone
// number, unapproved KYC at the time -- any of it permanently stranded
// the payout). This gives an admin a way back: reset to PENDING and
// enqueue it directly for the next worker pass, which re-runs every
// existing safety check (KYC gate, payment-status gate, phone-number
// check) exactly as it would for any other pending entry -- retrying
// doesn't bypass any of them.
export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id: paymentId } = context.params as { id: string };

    const ledgerEntry = await prisma.ledgerEntry.findUnique({ where: { payment_id: paymentId } });
    if (!ledgerEntry) {
      return NextResponse.json(
        { success: false, error: 'No ledger entry exists for this payment', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (ledgerEntry.disbursement_status !== 'FAILED') {
      return NextResponse.json(
        { success: false, error: 'Only a FAILED disbursement can be retried', code: 'NOT_FAILED' },
        { status: 400 }
      );
    }

    const { count } = await prisma.ledgerEntry.updateMany({
      where: { id: ledgerEntry.id, disbursement_status: 'FAILED' },
      data: { disbursement_status: 'PENDING' },
    });
    if (count === 0) {
      // Already retried by another request between the check and here.
      return NextResponse.json(
        { success: false, error: 'Only a FAILED disbursement can be retried', code: 'NOT_FAILED' },
        { status: 400 }
      );
    }

    await disbursementQueue.add('RETRY_DISBURSEMENT', { ledgerEntryId: ledgerEntry.id });

    await logAudit({
      action: AUDIT_ACTIONS.DISBURSEMENT_RETRIED,
      entityType: 'LedgerEntry',
      entityId: ledgerEntry.id,
      adminId: admin.id,
      ipAddress: getClientIp(request) || undefined,
    });

    return NextResponse.json({ success: true, data: { disbursement_status: 'PENDING' } });
  }
);
