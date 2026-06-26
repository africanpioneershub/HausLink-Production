import { sendWhatsAppMessage } from './client';

export async function sendWhatsAppWelcome({
  phone,
  name,
  role,
}: {
  phone: string;
  name: string;
  role: 'TENANT' | 'LANDLORD';
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hello ${name}! Welcome to HausLink 🏠\nYour ${role.toLowerCase()} account has been created.\nOur team will review and activate it shortly.\nQuestions? Reply to this message.`,
  });
}

export async function sendWhatsAppAccountApproved({
  phone,
  name,
  role,
}: {
  phone: string;
  name: string;
  role: 'TENANT' | 'LANDLORD';
}) {
  const nextStep =
    role === 'LANDLORD'
      ? 'Upload your ID to start listing properties.'
      : 'Browse and save properties.';

  await sendWhatsAppMessage({
    to: phone,
    text: `Your account has been approved! ✅\nYou can now log in to HausLink.\n${nextStep}\nhauslink.rw`,
  });
}

export async function sendWhatsAppAccountRejected({
  phone,
  name,
  reason,
}: {
  phone: string;
  name: string;
  reason: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${name}, your HausLink account application was not approved ⚠️\nReason: ${reason}\nContact support if you have questions.`,
  });
}

export async function sendWhatsAppKYCApproved({
  phone,
  name,
}: {
  phone: string;
  name: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Great news ${name}! ✅\nYour HausLink account is now verified.\nYou can now log in and start using the platform.\nhauslink.rw`,
  });
}

export async function sendWhatsAppKYCRejected({
  phone,
  name,
  reason,
}: {
  phone: string;
  name: string;
  reason: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${name}, your HausLink verification needs attention ⚠️\nReason: ${reason}\nPlease log in and resubmit your documents.`,
  });
}

export async function sendWhatsAppApplicationStatus({
  phone,
  tenantName,
  propertyTitle,
  status,
  reason,
}: {
  phone: string;
  tenantName: string;
  propertyTitle: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}) {
  const text =
    status === 'APPROVED'
      ? `Congratulations ${tenantName}! 🎉\nYour application for ${propertyTitle} has been approved!\nLog in to view your tenancy details.`
      : `Hi ${tenantName}, your application for ${propertyTitle} was not approved.\nReason: ${reason ?? 'Not specified'}\nBrowse other properties at hauslink.rw`;

  await sendWhatsAppMessage({ to: phone, text });
}

export async function sendWhatsAppRentDue({
  phone,
  tenantName,
  propertyTitle,
  amount,
  dueDate,
}: {
  phone: string;
  tenantName: string;
  propertyTitle: string;
  amount: number;
  dueDate: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${tenantName} 📅\nReminder: RWF ${amount.toLocaleString('en-US')} rent is due for ${propertyTitle}\nDue date: ${dueDate}\nPay via MTN MoMo, Airtel, or Stripe on hauslink.rw`,
  });
}

export async function sendWhatsAppRentPaid({
  phone,
  name,
  propertyTitle,
  amount,
  transactionRef,
  recipientType,
}: {
  phone: string;
  name: string;
  propertyTitle: string;
  amount: number;
  transactionRef: string;
  recipientType: 'TENANT' | 'LANDLORD';
}) {
  const formattedAmount = `RWF ${amount.toLocaleString('en-US')}`;
  const text =
    recipientType === 'TENANT'
      ? `Payment confirmed! ✅\n${formattedAmount} rent paid for ${propertyTitle}\nReference: ${transactionRef}\nThank you!`
      : `Rent received! 💰\n${formattedAmount} received for ${propertyTitle}\nReference: ${transactionRef}\nNet amount credited to your account.`;

  await sendWhatsAppMessage({ to: phone, text });
}

export async function sendWhatsAppMaintenanceUpdate({
  phone,
  tenantName,
  requestTitle,
  status,
  note,
}: {
  phone: string;
  tenantName: string;
  requestTitle: string;
  status: string;
  note?: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${tenantName}, maintenance update 🔧\nRequest: ${requestTitle}\nStatus: ${status}${note ? `\n${note}` : ''}`,
  });
}

export async function sendWhatsAppLeaseExpiry({
  phone,
  tenantName,
  propertyTitle,
  daysRemaining,
}: {
  phone: string;
  tenantName: string;
  propertyTitle: string;
  daysRemaining: number;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${tenantName} ⏰\nYour lease for ${propertyTitle} expires in ${daysRemaining} days.\nContact your landlord to discuss renewal.`,
  });
}

export async function sendWhatsAppPropertyApproved({
  phone,
  name,
  propertyTitle,
}: {
  phone: string;
  name: string;
  propertyTitle: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Great news ${name}! 🏠✅\nYour property "${propertyTitle}" is now live on HausLink!\nTenants can now find and apply.\nhauselink.com/properties`,
  });
}

export async function sendWhatsAppNewApplication({
  phone,
  landlordName,
  tenantName,
  propertyTitle,
}: {
  phone: string;
  landlordName: string;
  tenantName: string;
  propertyTitle: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${landlordName} 📋\n${tenantName} has applied for your property "${propertyTitle}".\nLog in to review their application.\nhauselink.com/landlord/applications`,
  });
}

export async function sendWhatsAppContactConfirmation({
  phone,
  name,
}: {
  phone: string;
  name: string;
}) {
  await sendWhatsAppMessage({
    to: phone,
    text: `Hi ${name}, we received your message!\nOur team at HausLink will get back to you within 24 hours.\nSupport: afriprimeholdings@gmail.com`,
  });
}
