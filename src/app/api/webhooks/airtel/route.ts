import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { completePayment, failPayment } from '@/lib/payments/complete';

function isValidAirtelSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.AIRTEL_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: without a configured secret, no callback can be trusted.
    return false;
  }
  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-airtel-signature');

  if (!isValidAirtelSignature(rawBody, signature)) {
    return NextResponse.json(
      { success: false, error: 'Invalid signature', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  const transaction = body?.transaction;
  const transactionId = typeof transaction?.id === 'string' ? transaction.id : undefined;
  const statusCode = typeof transaction?.status_code === 'string' ? transaction.status_code : undefined;
  const airtelMoneyId =
    typeof transaction?.airtel_money_id === 'string' ? transaction.airtel_money_id : undefined;

  if (!transactionId || !statusCode) {
    return NextResponse.json(
      { success: false, error: 'Invalid callback payload', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.findFirst({
    where: { OR: [{ id: transactionId }, { txn_ref: transactionId }] },
  });

  if (!payment) {
    // Airtel expects 200 OK regardless, so we don't surface lookup
    // failures as an error status — just log and acknowledge.
    console.error('[airtel webhook] Payment not found for reference', transactionId);
    return NextResponse.json({ success: true, data: { status: 'IGNORED' } });
  }

  if (statusCode === 'TS') {
    await completePayment(payment.id, airtelMoneyId);
    return NextResponse.json({ success: true, data: { status: 'COMPLETED' } });
  }

  if (statusCode === 'TF') {
    await failPayment(payment.id);
    return NextResponse.json({ success: true, data: { status: 'FAILED' } });
  }

  return NextResponse.json({ success: true, data: { status: 'IGNORED' } });
}
