import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { completePayment, failPayment } from '@/lib/payments/complete';

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
  const status = typeof body?.status === 'string' ? body.status : undefined;
  const financialTransactionId =
    typeof body?.financialTransactionId === 'string' ? body.financialTransactionId : undefined;

  if (!status) {
    return NextResponse.json(
      { success: false, error: 'Invalid callback payload', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

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

  if (status !== 'SUCCESSFUL') {
    await failPayment(payment.id);
    return NextResponse.json({ success: true, data: { status: 'FAILED' } });
  }

  await completePayment(payment.id, financialTransactionId);

  return NextResponse.json({ success: true, data: { status: 'COMPLETED' } });
}
