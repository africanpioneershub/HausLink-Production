import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { deleteCache, deleteCachePattern } from '@/lib/redis/cache';

export const DELETE = withAuth(['ADMIN'])(
  async (_request, context) => {
    const { id } = context.params as { id: string };

    await prisma.propertyImage.deleteMany({ where: { property_id: id } });
    await prisma.property.delete({ where: { id } });

    await Promise.all([
      deleteCachePattern('public:properties:*'),
      deleteCache('public:stats'),
    ]);

    await logAudit({
      action: AUDIT_ACTIONS.PROPERTY_DELETED,
      entityType: 'Property',
      entityId: id,
    });

    return NextResponse.json({ success: true });
  }
);

export const PATCH = withAuth(['ADMIN'])(
  async (request, context) => {
    const { id } = context.params as { id: string };
    const body = await request.json() as {
      title?: string;
      type?: string;
      district?: string;
      city?: string;
      rent_rwf?: number;
      bedrooms?: number;
      bathrooms?: number;
      description?: string;
      status?: string;
      featured?: boolean;
    };

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.district !== undefined && { district: body.district }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.rent_rwf !== undefined && { rent_rwf: body.rent_rwf }),
        ...(body.bedrooms !== undefined && { bedrooms: body.bedrooms }),
        ...(body.bathrooms !== undefined && { bathrooms: body.bathrooms }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.featured !== undefined && { featured: body.featured }),
      },
    });

    await Promise.all([
      deleteCachePattern('public:properties:*'),
      deleteCache('public:stats'),
    ]);

    await logAudit({
      action: AUDIT_ACTIONS.PROPERTY_UPDATED,
      entityType: 'Property',
      entityId: id,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
