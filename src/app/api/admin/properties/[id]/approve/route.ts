import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { deleteCache, deleteCachePattern } from '@/lib/redis/cache';
import { sendPropertyApprovedEmail } from '@/lib/email/templates';
import { sendWhatsAppPropertyApproved } from '@/lib/whatsapp/templates';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { status: 'ACTIVE', is_verified: true },
    });

    await Promise.all([
      deleteCache('public:stats'),
      deleteCachePattern('public:properties:*'),
    ]);

    await logAudit({
      action: AUDIT_ACTIONS.PROPERTY_APPROVED,
      entityType: 'Property',
      entityId: id,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    const landlord = await prisma.user.findUnique({ where: { id: property.landlord_id } });
    if (landlord) {
      sendPropertyApprovedEmail({
        name: landlord.name ?? 'there',
        email: landlord.email,
        propertyTitle: property.title,
      }).catch((error) => console.error('[property approve] Email failed', error));

      const waPhone = landlord.whatsapp ?? landlord.phone;
      if (waPhone) {
        sendWhatsAppPropertyApproved({
          phone: waPhone,
          name: landlord.name ?? 'there',
          propertyTitle: property.title,
        }).catch((error) => console.error('[property approve] WhatsApp failed', error));
      }
    }

    return NextResponse.json({ success: true, data: updated });
  }
);
