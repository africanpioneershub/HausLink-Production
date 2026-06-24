import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

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

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  }
);
