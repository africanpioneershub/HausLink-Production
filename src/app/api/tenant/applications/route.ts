import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { sendNewApplicationEmail } from '@/lib/email/templates';
import { sendWhatsAppNewApplication } from '@/lib/whatsapp/templates';
import { AUDIT_ACTIONS } from '@/lib/constants';

const createApplicationSchema = z.object({ property_id: z.string() });

export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const applications = await prisma.application.findMany({
      where: { tenant_id: user.id },
      orderBy: { applied_at: 'desc' },
      include: {
        property: {
          select: { id: true, title: true, city: true, district: true, rent_rwf: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: applications });
  }
);

export const POST = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Server-side re-check, matching the same pattern already used
    // correctly on the landlord side (api/landlord/properties POST) --
    // the "Apply" button's visibility is a UI convenience, not a security
    // boundary, so a direct POST must independently enforce this.
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.kyc_status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Identity verification required before applying', code: 'KYC_REQUIRED' },
        { status: 403 }
      );
    }

    const property = await prisma.property.findUnique({ where: { id: parsed.data.property_id } });
    if (!property || property.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Property is not available', code: 'NOT_AVAILABLE' },
        { status: 400 }
      );
    }

    const existing = await prisma.application.findFirst({
      where: {
        tenant_id: user.id,
        property_id: property.id,
        status: { in: ['PENDING', 'REVIEWING', 'APPROVED'] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this property', code: 'DUPLICATE' },
        { status: 409 }
      );
    }

    const application = await prisma.application.create({
      data: {
        tenant_id: user.id,
        landlord_id: property.landlord_id,
        property_id: property.id,
      },
    });

    const landlord = await prisma.user.findUnique({ where: { id: property.landlord_id } });
    const tenant = dbUser;

    if (landlord) {
      sendNewApplicationEmail({
        landlordName: landlord.name ?? 'there',
        landlordEmail: landlord.email,
        tenantName: tenant?.name ?? 'A tenant',
        propertyTitle: property.title,
        applicationLink: 'https://hauselink.com/landlord/applications',
      }).catch((error) => console.error('[application create] Email failed', error));

      const waPhone = landlord.whatsapp ?? landlord.phone;
      if (waPhone) {
        sendWhatsAppNewApplication({
          phone: waPhone,
          landlordName: landlord.name ?? 'there',
          tenantName: tenant?.name ?? 'A tenant',
          propertyTitle: property.title,
        }).catch((error) => console.error('[application create] WhatsApp failed', error));
      }
    }

    prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: AUDIT_ACTIONS.APPLICATION_SUBMITTED,
        entity_type: 'Application',
        entity_id: application.id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        metadata: { property_id: property.id },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  }
);
