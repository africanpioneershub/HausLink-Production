import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const updatePropertySchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'ROOM', 'STUDIO', 'VILLA', 'OFFICE', 'COMMERCIAL']).optional(),
  district: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(100).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  rent_rwf: z.number().int().positive().optional(),
  deposit_rwf: z.number().int().min(0).optional(),
});

export const PATCH = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { id } = context.params as { id: string };

    const property = await prisma.property.findFirst({ where: { id, landlord_id: user.id } });
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (property.status === 'OCCUPIED') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit an occupied property', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updatePropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.property.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
