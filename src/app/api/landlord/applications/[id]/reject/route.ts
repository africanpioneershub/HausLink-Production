import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { sendApplicationStatusEmail } from '@/lib/email/templates';
import { sendWhatsAppApplicationStatus } from '@/lib/whatsapp/templates';

export const POST = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { id } = context.params as { id: string };

    const application = await prisma.application.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!application || application.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING' && application.status !== 'REVIEWING') {
      return NextResponse.json(
        { success: false, error: 'Application cannot be rejected', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'A rejection reason is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'REJECTED', reviewed_at: new Date(), notes: reason },
    });

    const tenant = await prisma.user.findUnique({ where: { id: application.tenant_id } });
    if (tenant) {
      sendApplicationStatusEmail({
        tenantName: tenant.name ?? 'there',
        tenantEmail: tenant.email,
        propertyTitle: application.property.title,
        status: 'REJECTED',
        reason,
      }).catch((error) => console.error('[application reject] Email failed', error));

      const whatsappPhone = tenant.whatsapp ?? tenant.phone;
      if (whatsappPhone) {
        sendWhatsAppApplicationStatus({
          phone: whatsappPhone,
          tenantName: tenant.name ?? 'there',
          propertyTitle: application.property.title,
          status: 'REJECTED',
          reason,
        }).catch((error) => console.error('[application reject] WhatsApp failed', error));
      }
    }

    return NextResponse.json({ success: true, data: updated });
  }
);
