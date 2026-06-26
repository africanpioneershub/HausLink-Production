import { prisma } from '@/lib/prisma/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendRentPaidEmail } from '@/lib/email/templates';
import { sendWhatsAppRentPaid } from '@/lib/whatsapp/templates';

type PaymentWithRelations = Awaited<ReturnType<typeof loadPayment>>;

function loadPayment(paymentId: string) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { tenancy: { include: { property: true } }, tenant: true, landlord: true },
  });
}

/**
 * Marks a payment COMPLETED, creates its LedgerEntry, flips the landlord's
 * registration_paid flag for REGISTRATION-type payments, and fires
 * tenant/landlord notifications. Idempotent — safe to call from both the
 * webhook and a client-driven status poll without double-crediting.
 */
export async function completePayment(
  paymentId: string,
  txnRef?: string
): Promise<PaymentWithRelations | null> {
  const payment = await loadPayment(paymentId);
  if (!payment) return null;
  if (payment.status === 'COMPLETED') return payment;

  const config = await prisma.platformConfig.findFirst();
  const feePct = config?.transaction_fee_pct ? Number(config.transaction_fee_pct) : 0.02;

  const grossAmount = payment.amount_rwf;
  const platformFee = Math.round(Number(grossAmount) * feePct);
  const netAmount = grossAmount - platformFee;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paid_at: new Date(),
        txn_ref: txnRef ?? payment.txn_ref,
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

  if (payment.type === 'REGISTRATION') {
    await prisma.user.update({
      where: { id: payment.landlord_id },
      data: { registration_paid: true },
    });

    try {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(payment.landlord_id);
      await supabaseAdmin.auth.admin.updateUserById(payment.landlord_id, {
        user_metadata: { ...authUserData.user?.user_metadata, registration_paid: true },
      });
    } catch (error) {
      console.error('[completePayment] Failed to sync registration_paid to Supabase metadata', error);
    }
  }

  const propertyTitle = payment.tenancy?.property.title ?? 'your property';
  const transactionRef = txnRef ?? payment.id;

  sendRentPaidEmail({
    tenantName: payment.tenant.name ?? 'there',
    tenantEmail: payment.tenant.email,
    landlordName: payment.landlord.name ?? 'there',
    landlordEmail: payment.landlord.email,
    propertyTitle,
    amount: grossAmount,
    transactionRef,
  }).catch((error) => console.error('[completePayment] Email failed', error));

  const tenantWhatsapp = payment.tenant.whatsapp ?? payment.tenant.phone;
  const landlordWhatsapp = payment.landlord.whatsapp ?? payment.landlord.phone;

  if (tenantWhatsapp) {
    sendWhatsAppRentPaid({
      phone: tenantWhatsapp,
      name: payment.tenant.name ?? 'there',
      propertyTitle,
      amount: grossAmount,
      transactionRef,
      recipientType: 'TENANT',
    }).catch((error) => console.error('[completePayment] Tenant WhatsApp failed', error));
  }

  if (landlordWhatsapp) {
    sendWhatsAppRentPaid({
      phone: landlordWhatsapp,
      name: payment.landlord.name ?? 'there',
      propertyTitle,
      amount: netAmount,
      transactionRef,
      recipientType: 'LANDLORD',
    }).catch((error) => console.error('[completePayment] Landlord WhatsApp failed', error));
  }

  return loadPayment(payment.id);
}

export async function failPayment(paymentId: string): Promise<void> {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'FAILED' },
  });
}
