import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { getMoMoPaymentStatus } from '@/lib/payments/momo';
import { getAirtelPaymentStatus } from '@/lib/payments/airtel';
import { completePayment, failPayment } from '@/lib/payments/complete';

export const GET = withAuth(['TENANT', 'LANDLORD', 'ADMIN'])(
  async (_request, context, user) => {
    const { id } = context.params as { id: string };

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const role = user.user_metadata?.role as string;
    const isParticipant = payment.tenant_id === user.id || payment.landlord_id === user.id;
    if (role !== 'ADMIN' && !isParticipant) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    let currentStatus = payment.status;

    if (payment.status === 'PENDING' && payment.method === 'MTN_MOMO' && payment.txn_ref) {
      const momoStatus = await getMoMoPaymentStatus(payment.txn_ref);

      if (momoStatus === 'SUCCESSFUL') {
        const updated = await completePayment(payment.id);
        currentStatus = updated?.status ?? 'COMPLETED';
      } else if (momoStatus === 'FAILED') {
        await failPayment(payment.id);
        currentStatus = 'FAILED';
      }
    }

    if (payment.status === 'PENDING' && payment.method === 'AIRTEL_MONEY' && payment.txn_ref) {
      const airtelStatus = await getAirtelPaymentStatus(payment.txn_ref);

      if (airtelStatus === 'SUCCESSFUL') {
        const updated = await completePayment(payment.id);
        currentStatus = updated?.status ?? 'COMPLETED';
      } else if (airtelStatus === 'FAILED') {
        await failPayment(payment.id);
        currentStatus = 'FAILED';
      }
    }

    return NextResponse.json({ success: true, data: { id: payment.id, status: currentStatus } });
  }
);
