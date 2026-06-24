import { prisma } from '@/lib/prisma/client';
import {
  sendKYCApprovedEmail,
  sendKYCRejectedEmail,
  sendApplicationStatusEmail,
  sendRentDueEmail,
  sendMaintenanceUpdateEmail,
  sendLeaseExpiryEmail,
} from '@/lib/email/templates';
import {
  sendWhatsAppKYCApproved,
  sendWhatsAppKYCRejected,
  sendWhatsAppApplicationStatus,
  sendWhatsAppRentDue,
  sendWhatsAppMaintenanceUpdate,
  sendWhatsAppLeaseExpiry,
} from '@/lib/whatsapp/templates';

export type NotificationType =
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'APPLICATION_STATUS'
  | 'RENT_DUE'
  | 'MAINTENANCE_UPDATE'
  | 'LEASE_EXPIRY';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  data: Record<string, any>;
}

export async function sendNotification({ userId, type, data }: SendNotificationParams) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });

  if (!user) {
    console.error('[sendNotification] User not found', userId);
    return;
  }

  const whatsappPhone = user.whatsapp ?? user.phone;
  const wantsEmail = user.preferences?.notification_email ?? true;
  const wantsWhatsapp = (user.preferences?.notification_whatsapp ?? true) && !!whatsappPhone;

  const name = user.name ?? 'there';

  switch (type) {
    case 'KYC_APPROVED':
      if (wantsEmail) await sendKYCApprovedEmail({ name, email: user.email });
      if (wantsWhatsapp) await sendWhatsAppKYCApproved({ phone: whatsappPhone!, name });
      break;

    case 'KYC_REJECTED':
      if (wantsEmail)
        await sendKYCRejectedEmail({ name, email: user.email, reason: data.reason });
      if (wantsWhatsapp)
        await sendWhatsAppKYCRejected({ phone: whatsappPhone!, name, reason: data.reason });
      break;

    case 'APPLICATION_STATUS':
      if (wantsEmail)
        await sendApplicationStatusEmail({
          tenantName: name,
          tenantEmail: user.email,
          propertyTitle: data.propertyTitle,
          status: data.status,
          reason: data.reason,
        });
      if (wantsWhatsapp)
        await sendWhatsAppApplicationStatus({
          phone: whatsappPhone!,
          tenantName: name,
          propertyTitle: data.propertyTitle,
          status: data.status,
          reason: data.reason,
        });
      break;

    case 'RENT_DUE':
      if (wantsEmail)
        await sendRentDueEmail({
          tenantName: name,
          tenantEmail: user.email,
          propertyTitle: data.propertyTitle,
          amount: data.amount,
          dueDate: data.dueDate,
        });
      if (wantsWhatsapp)
        await sendWhatsAppRentDue({
          phone: whatsappPhone!,
          tenantName: name,
          propertyTitle: data.propertyTitle,
          amount: data.amount,
          dueDate: data.dueDate,
        });
      break;

    case 'MAINTENANCE_UPDATE':
      if (wantsEmail)
        await sendMaintenanceUpdateEmail({
          tenantName: name,
          tenantEmail: user.email,
          requestTitle: data.requestTitle,
          status: data.status,
          note: data.note,
        });
      if (wantsWhatsapp)
        await sendWhatsAppMaintenanceUpdate({
          phone: whatsappPhone!,
          tenantName: name,
          requestTitle: data.requestTitle,
          status: data.status,
          note: data.note,
        });
      break;

    case 'LEASE_EXPIRY':
      if (wantsEmail)
        await sendLeaseExpiryEmail({
          tenantName: name,
          tenantEmail: user.email,
          propertyTitle: data.propertyTitle,
          daysRemaining: data.daysRemaining,
          endDate: data.endDate,
        });
      if (wantsWhatsapp)
        await sendWhatsAppLeaseExpiry({
          phone: whatsappPhone!,
          tenantName: name,
          propertyTitle: data.propertyTitle,
          daysRemaining: data.daysRemaining,
        });
      break;

    default:
      console.error('[sendNotification] Unknown notification type', type);
  }
}
