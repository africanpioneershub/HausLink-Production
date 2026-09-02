import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { getClientIp } from '@/lib/admin-guard';
import { generateIdempotencyKey } from '@/lib/utils';
import { initiateMoMoPayment } from '@/lib/payments/momo';
import { initiateAirtelPayment } from '@/lib/payments/airtel';
import { AUDIT_ACTIONS } from '@/lib/constants';

const initiateSchema = z.object({
  tenancyId: z.string().min(1),
  method: z.enum(['MTN_MOMO', 'AIRTEL_MONEY', 'STRIPE']),
  phoneNumber: z.string().min(4).max(20).optional(),
});

interface PaymentInstructions {
  message: string;
  steps: string[];
}

function buildInstructions(method: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'STRIPE'): PaymentInstructions {
  if (method === 'MTN_MOMO') {
    return {
      message: 'Payment request sent to your phone',
      steps: [
        'Check your phone for an MTN MoMo prompt',
        'Enter your MoMo PIN to confirm payment',
        'You will receive a confirmation SMS',
      ],
    };
  }

  return {
    message: 'Payment request sent to your phone',
    steps: [
      'Check your phone for an Airtel Money prompt',
      'Enter your Airtel Money PIN to confirm payment',
      'You will receive a confirmation SMS',
    ],
  };
}

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

    const { tenancyId, method, phoneNumber } = parsed.data;

    if (method === 'STRIPE') {
      return NextResponse.json(
        { success: false, error: 'Card payments are not yet available', code: 'NOT_SUPPORTED' },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

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

    const amount = tenancy.rent_rwf;

    // Prevent duplicate in-flight requests: if the tenant already has a
    // pending rent payment for this tenancy, return it instead of creating
    // a second one.
    const existingPending = await prisma.payment.findFirst({
      where: {
        tenant_id: user.id,
        tenancy_id: tenancy.id,
        status: 'PENDING',
        type: 'MONTHLY_RENT',
      },
      orderBy: { created_at: 'desc' },
    });

    if (existingPending) {
      return NextResponse.json({
        success: true,
        data: {
          paymentId: existingPending.id,
          status: 'PENDING',
          method: existingPending.method,
          amount: existingPending.amount_rwf,
          instructions: buildInstructions(existingPending.method as 'MTN_MOMO' | 'AIRTEL_MONEY'),
        },
      });
    }

    const idempotencyKey = generateIdempotencyKey();
    const description = `Rent payment for ${tenancy.property.title}`;

    let payment;
    try {
      payment = await prisma.payment.create({
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
    } catch (error) {
      // The findFirst check above is a fast-path optimization, not the
      // actual concurrency guard -- that's the partial unique index on
      // (tenant_id, tenancy_id, type) WHERE status = 'PENDING' (see
      // supabase/migrations/20260903000000_prevent_duplicate_pending_payment.sql).
      // A concurrent request can still win the race between that read and
      // this insert; when it does, Postgres raises a unique violation
      // (P2002) here instead of letting a second PENDING payment through.
      // Rather than 500 the losing request, return whichever payment
      // actually won.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await prisma.payment.findFirst({
          where: { tenant_id: user.id, tenancy_id: tenancy.id, status: 'PENDING', type: 'MONTHLY_RENT' },
          orderBy: { created_at: 'desc' },
        });
        if (winner) {
          return NextResponse.json({
            success: true,
            data: {
              paymentId: winner.id,
              status: 'PENDING',
              method: winner.method,
              amount: winner.amount_rwf,
              instructions: buildInstructions(winner.method as 'MTN_MOMO' | 'AIRTEL_MONEY'),
            },
          });
        }
      }
      throw error;
    }

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

    prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: AUDIT_ACTIONS.PAYMENT_INITIATED,
        entity_type: 'Payment',
        entity_id: payment.id,
        ip_address: getClientIp(request) || undefined,
        metadata: { method, amount, tenancy_id: tenancyId },
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: payment.id,
          status: 'PENDING',
          method,
          amount,
          instructions: buildInstructions(method),
        },
      },
      { status: 201 }
    );
  }
);
