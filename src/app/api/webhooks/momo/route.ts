import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { completePayment, failPayment } from '@/lib/payments/complete';
import { getMoMoPaymentStatus } from '@/lib/payments/momo';

// MTN's MoMo Collections API documents no HMAC/signature over the callback
// body, and no published source-IP range to allowlist (confirmed directly
// against MTN's own developer docs/community -- see docs/INCIDENT_LOG.md).
// This check is kept as a cheap first-pass filter, not the security
// boundary: it compares against the same subscription key this app already
// sends outbound on every MoMo API call, so anyone holding that credential
// can pass it. The real guarantee is below -- this callback's body is never
// trusted to decide anything; it only triggers a re-check against MTN's
// authenticated GET status endpoint.
function isValidMomoToken(token: string | null): boolean {
  const secret = process.env.MOMO_SUBSCRIPTION_KEY;
  if (!token || !secret) return false;
  try {
    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(secret);
    if (tokenBuf.length !== secretBuf.length) return false;
    return timingSafeEqual(tokenBuf, secretBuf);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const callbackToken = request.headers.get('x-callback-token');
  if (!isValidMomoToken(callbackToken)) {
    return NextResponse.json(
      { success: false, error: 'Invalid callback token', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const referenceId = request.headers.get('x-reference-id');

  const body = await request.json().catch(() => null);
  const externalId = typeof body?.externalId === 'string' ? body.externalId : undefined;
  const financialTransactionId =
    typeof body?.financialTransactionId === 'string' ? body.financialTransactionId : undefined;

  const lookupId = externalId ?? referenceId;
  if (!lookupId) {
    return NextResponse.json(
      { success: false, error: 'Missing payment reference', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.findFirst({
    where: { OR: [{ id: lookupId }, { txn_ref: lookupId }] },
  });

  if (!payment) {
    // MoMo expects 200 OK regardless, so we don't surface lookup failures
    // as an error status — just log and acknowledge.
    console.error('[momo webhook] Payment not found for reference', lookupId);
    return NextResponse.json({ success: true, data: { status: 'IGNORED' } });
  }

  // The callback body's own claimed status is never trusted (see comment on
  // isValidMomoToken above) -- this call re-asks MTN's authenticated GET
  // status endpoint, the same one the tenant-facing status poll already
  // relies on, and only that answer can move a Payment/LedgerEntry.
  // externalId was set to payment.id at initiation (initiate/route.ts), and
  // txn_ref was set to that same value, so payment.id is always the right
  // reference to query MTN with regardless of which lookup path matched.
  const authoritativeStatus = await getMoMoPaymentStatus(payment.id);

  if (authoritativeStatus === 'PENDING') {
    // MTN's own systems don't yet agree the transaction is final. Do
    // nothing -- a later callback, or the tenant-facing status poll, will
    // catch the eventual outcome.
    return NextResponse.json({ success: true, data: { status: 'PENDING' } });
  }

  if (authoritativeStatus !== 'SUCCESSFUL') {
    await failPayment(payment.id);
    return NextResponse.json({ success: true, data: { status: 'FAILED' } });
  }

  await completePayment(payment.id, financialTransactionId);

  return NextResponse.json({ success: true, data: { status: 'COMPLETED' } });
}
