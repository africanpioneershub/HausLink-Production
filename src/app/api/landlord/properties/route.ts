import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const createPropertySchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(5000).optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'ROOM', 'STUDIO', 'VILLA', 'OFFICE', 'COMMERCIAL']),
  district: z.string().min(2).max(100),
  city: z.string().min(2).max(100).optional(),
  address: z.string().max(255).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  rent_rwf: z.number().int().positive(),
  deposit_rwf: z.number().int().min(0).optional(),
});

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const properties = await prisma.property.findMany({
      where: { landlord_id: user.id },
      orderBy: { created_at: 'desc' },
      include: { images: { where: { is_primary: true }, take: 1 } },
    });

    const kpis = {
      total: properties.length,
      available: properties.filter((p) => p.status === 'ACTIVE').length,
      rented: properties.filter((p) => p.status === 'OCCUPIED').length,
      draft: properties.filter((p) => p.status === 'DRAFT').length,
    };

    return NextResponse.json({ success: true, data: { properties, kpis } });
  }
);

export const POST = withAuth(['LANDLORD'])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.kyc_status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'KYC verification required before listing properties', code: 'KYC_REQUIRED' },
        { status: 403 }
      );
    }
    if (!dbUser?.registration_paid) {
      return NextResponse.json(
        { success: false, error: 'Registration fee payment required before listing properties', code: 'PAYMENT_REQUIRED' },
        { status: 403 }
      );
    }

    const property = await prisma.property.create({
      data: {
        landlord_id: user.id,
        status: 'PENDING_APPROVAL',
        ...parsed.data,
      },
    });

    return NextResponse.json({ success: true, data: property }, { status: 201 });
  }
);
