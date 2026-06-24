import { resend } from './client';

const FROM = 'HausLink <notifications@hauslink.rw>';
const SUPPORT_EMAIL = 'afriprimeholdings@gmail.com';

async function send(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error('[Email] Failed to send', { to, subject, error });
  }
}

export async function sendWelcomeEmail({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: 'TENANT' | 'LANDLORD';
  phone?: string;
}) {
  const nextSteps =
    role === 'LANDLORD'
      ? 'Next, complete your KYC verification and registration payment to start listing properties.'
      : 'Next, complete your KYC verification so you can apply for properties.';

  await send(
    email,
    'Welcome to HausLink!',
    `<p>Hi ${name},</p>
     <p>Welcome to HausLink! Your ${role.toLowerCase()} account has been created.</p>
     <p>${nextSteps}</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendAccountApprovedEmail({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: 'TENANT' | 'LANDLORD';
}) {
  const whatCanYouDo =
    role === 'LANDLORD'
      ? 'Upload your ID to start listing properties.'
      : 'Browse and save properties.';

  await send(
    email,
    'Your HausLink account is approved!',
    `<p>Great news ${name}!</p>
     <p>Your HausLink account has been approved. You can now log in and start using the platform.</p>
     <p><a href="https://hauslink.vercel.app/login">Log in to HausLink</a></p>
     <p><strong>What you can do now:</strong> ${whatCanYouDo}</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendAccountRejectedEmail({
  name,
  email,
  reason,
}: {
  name: string;
  email: string;
  reason: string;
}) {
  await send(
    email,
    'HausLink account update',
    `<p>Hi ${name},</p>
     <p>We were unable to approve your HausLink account.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p>Please contact our support team if you have questions.</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendKYCApprovedEmail({
  name,
  email,
}: {
  name: string;
  email: string;
  phone?: string;
}) {
  await send(
    email,
    'Your HausLink account is verified!',
    `<p>Hi ${name},</p>
     <p>Great news — your identity verification has been approved. Your HausLink account is now fully active.</p>
     <p><a href="https://hauslink.rw/login">Log in to HausLink</a></p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendKYCRejectedEmail({
  name,
  email,
  reason,
}: {
  name: string;
  email: string;
  phone?: string;
  reason: string;
}) {
  await send(
    email,
    'Action required: HausLink verification',
    `<p>Hi ${name},</p>
     <p>We were unable to approve your identity verification.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p>Please log in and resubmit your documents.</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendApplicationStatusEmail({
  tenantName,
  tenantEmail,
  propertyTitle,
  status,
  reason,
}: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  propertyTitle: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}) {
  const body =
    status === 'APPROVED'
      ? `<p>Congratulations — your application for <strong>${propertyTitle}</strong> has been approved!</p>
         <p>Log in to view your tenancy details.</p>`
      : `<p>Your application for <strong>${propertyTitle}</strong> was not approved.</p>
         ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
         <p>Browse other properties at hauslink.rw.</p>`;

  await send(
    tenantEmail,
    `Application update for ${propertyTitle}`,
    `<p>Hi ${tenantName},</p>${body}<p>— The HausLink Team</p>`
  );
}

export async function sendRentDueEmail({
  tenantName,
  tenantEmail,
  propertyTitle,
  amount,
  dueDate,
}: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  propertyTitle: string;
  amount: number;
  dueDate: string;
}) {
  await send(
    tenantEmail,
    `Rent payment due: ${propertyTitle}`,
    `<p>Hi ${tenantName},</p>
     <p>This is a reminder that rent of RWF ${amount.toLocaleString('en-US')} for
     <strong>${propertyTitle}</strong> is due on ${dueDate}.</p>
     <p>Pay via MTN MoMo, Airtel Money, or Stripe on hauslink.rw.</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendRentPaidEmail({
  tenantName,
  tenantEmail,
  landlordName,
  landlordEmail,
  propertyTitle,
  amount,
  transactionRef,
}: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;
  propertyTitle: string;
  amount: number;
  transactionRef: string;
}) {
  const formattedAmount = `RWF ${amount.toLocaleString('en-US')}`;

  await send(
    tenantEmail,
    `Rent payment confirmed: ${propertyTitle}`,
    `<p>Hi ${tenantName},</p>
     <p>Your rent payment of ${formattedAmount} for <strong>${propertyTitle}</strong> has been confirmed.</p>
     <p>Reference: ${transactionRef}</p>
     <p>— The HausLink Team</p>`
  );

  await send(
    landlordEmail,
    `Rent payment confirmed: ${propertyTitle}`,
    `<p>Hi ${landlordName},</p>
     <p>You have received a rent payment of ${formattedAmount} for <strong>${propertyTitle}</strong>.</p>
     <p>Reference: ${transactionRef}</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendMaintenanceUpdateEmail({
  tenantName,
  tenantEmail,
  requestTitle,
  status,
  note,
}: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  requestTitle: string;
  status: string;
  note?: string;
}) {
  await send(
    tenantEmail,
    'Maintenance request update',
    `<p>Hi ${tenantName},</p>
     <p>Your maintenance request <strong>${requestTitle}</strong> has been updated to: <strong>${status}</strong>.</p>
     ${note ? `<p>${note}</p>` : ''}
     <p>— The HausLink Team</p>`
  );
}

export async function sendLeaseExpiryEmail({
  tenantName,
  tenantEmail,
  propertyTitle,
  daysRemaining,
  endDate,
}: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  propertyTitle: string;
  daysRemaining: number;
  endDate: string;
}) {
  await send(
    tenantEmail,
    `Your lease expires in ${daysRemaining} days`,
    `<p>Hi ${tenantName},</p>
     <p>Your lease for <strong>${propertyTitle}</strong> expires in ${daysRemaining} days (${endDate}).</p>
     <p>Contact your landlord to discuss renewal.</p>
     <p>— The HausLink Team</p>`
  );
}

export async function sendContactFormEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  await send(
    SUPPORT_EMAIL,
    `New contact: ${subject}`,
    `<p><strong>From:</strong> ${name} (${email})</p>
     <p><strong>Subject:</strong> ${subject}</p>
     <p>${message}</p>`
  );
}
