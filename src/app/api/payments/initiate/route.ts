import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { generateIdempotencyKey } from '@/lib/utils';
import { initiateMoMoPayment } from '@/lib/payments/momo';
import { initiateAirtelPayment } from '@/lib/payments/airtel';

const initiateSchema = z.object({
  tenancyId: z.string().min(1),
  method: z.enum(['MTN_MOMO', 'AIRTEL_MONEY']),
  phoneNumber: z.string().min(4).max(20),
  amount: z.number().int().positive(),
});

export const POST = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = initiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { tenancyId, method, phoneNumber, amount } = parsed.data;

    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: true },
    });

    if (!tenancy || tenancy.tenant_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Tenancy not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const idempotencyKey = generateIdempotencyKey();
    const description = `Rent payment for ${tenancy.property.title}`;

    const payment = await prisma.payment.create({
      data: {
        tenant_id: tenancy.tenant_id,
        landlord_id: tenancy.landlord_id,
        tenancy_id: tenancy.id,
        type: 'MONTHLY_RENT',
        status: 'PENDING',
        method,
        amount_rwf: amount,
        idempotency_key: idempotencyKey,
      },
    });

    const result =
      method === 'MTN_MOMO'
        ? await initiateMoMoPayment({
            phoneNumber,
            amount,
            externalId: payment.id,
            description,
          })
        : await initiateAirtelPayment({
            phoneNumber,
            amount,
            reference: payment.id,
            description,
          });

    if (result.status === 'FAILED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      return NextResponse.json(
        { success: false, error: result.error ?? 'Failed to initiate payment', code: 'PROVIDER_ERROR' },
        { status: 502 }
      );
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { txn_ref: result.transactionId },
    });

    const instructions =
      method === 'MTN_MOMO'
        ? 'Approve the payment prompt sent to your MTN MoMo phone to complete the transaction.'
        : 'Approve the payment prompt sent to your Airtel Money phone to complete the transaction.';

    return NextResponse.json(
      {
        success: true,
        data: { paymentId: payment.id, status: 'PENDING', instructions },
      },
      { status: 201 }
    );
  }
);
