import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { sendApplicationStatusEmail } from '@/lib/email/templates';
import { sendWhatsAppApplicationStatus } from '@/lib/whatsapp/templates';

export const POST = withAuth(['LANDLORD'])(
  async (_request, context, user) => {
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
        { success: false, error: 'Application cannot be approved', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const [updatedApplication, tenancy] = await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: { status: 'APPROVED', reviewed_at: new Date() },
      }),
      prisma.tenancy.create({
        data: {
          tenant_id: application.tenant_id,
          landlord_id: application.landlord_id,
          property_id: application.property_id,
          rent_rwf: application.property.rent_rwf,
          deposit_rwf: application.property.deposit_rwf,
          start_date: startDate,
          end_date: endDate,
        },
      }),
      prisma.property.update({
        where: { id: application.property_id },
        data: { status: 'OCCUPIED' },
      }),
    ]);

    const tenant = await prisma.user.findUnique({ where: { id: application.tenant_id } });
    if (tenant) {
      sendApplicationStatusEmail({
        tenantName: tenant.name ?? 'there',
        tenantEmail: tenant.email,
        propertyTitle: application.property.title,
        status: 'APPROVED',
      }).catch((error) => console.error('[application approve] Email failed', error));

      if (tenant.phone) {
        sendWhatsAppApplicationStatus({
          phone: tenant.phone,
          tenantName: tenant.name ?? 'there',
          propertyTitle: application.property.title,
          status: 'APPROVED',
        }).catch((error) => console.error('[application approve] WhatsApp failed', error));
      }
    }

    return NextResponse.json({
      success: true,
      data: { application: updatedApplication, tenancy },
    });
  }
);
