import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { PLATFORM_FEE_PCT } from '@/lib/constants';
import { sendRentPaidEmail } from '@/lib/email/templates';
import { sendWhatsAppRentPaid } from '@/lib/whatsapp/templates';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const transaction = body?.transaction;
  const paymentId = typeof transaction?.id === 'string' ? transaction.id : undefined;
  const statusCode = typeof transaction?.status_code === 'string' ? transaction.status_code : undefined;
  const airtelMoneyId =
    typeof transaction?.airtel_money_id === 'string' ? transaction.airtel_money_id : undefined;

  if (!paymentId || !statusCode) {
    return NextResponse.json(
      { success: false, error: 'Invalid callback payload', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { tenancy: { include: { property: true } }, tenant: true, landlord: true },
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  if (statusCode !== 'TS') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });
    return NextResponse.json({ success: true, data: { status: 'FAILED' } });
  }

  const grossAmount = payment.amount_rwf;
  const platformFee = Math.round(grossAmount * PLATFORM_FEE_PCT);
  const netAmount = grossAmount - platformFee;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paid_at: new Date(),
        txn_ref: airtelMoneyId ?? payment.txn_ref,
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        payment_id: payment.id,
        gross_amount_rwf: grossAmount,
        platform_fee_rwf: platformFee,
        landlord_net_rwf: netAmount,
      },
    }),
  ]);

  const propertyTitle = payment.tenancy?.property.title ?? 'your property';
  const transactionRef = airtelMoneyId ?? payment.id;

  sendRentPaidEmail({
    tenantName: payment.tenant.name ?? 'there',
    tenantEmail: payment.tenant.email,
    landlordName: payment.landlord.name ?? 'there',
    landlordEmail: payment.landlord.email,
    propertyTitle,
    amount: grossAmount,
    transactionRef,
  }).catch((error) => console.error('[airtel webhook] Email failed', error));

  if (payment.tenant.phone) {
    sendWhatsAppRentPaid({
      phone: payment.tenant.phone,
      name: payment.tenant.name ?? 'there',
      propertyTitle,
      amount: grossAmount,
      transactionRef,
      recipientType: 'TENANT',
    }).catch((error) => console.error('[airtel webhook] Tenant WhatsApp failed', error));
  }

  if (payment.landlord.phone) {
    sendWhatsAppRentPaid({
      phone: payment.landlord.phone,
      name: payment.landlord.name ?? 'there',
      propertyTitle,
      amount: netAmount,
      transactionRef,
      recipientType: 'LANDLORD',
    }).catch((error) => console.error('[airtel webhook] Landlord WhatsApp failed', error));
  }

  return NextResponse.json({ success: true, data: { status: 'COMPLETED' } });
}
