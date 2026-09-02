import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { deleteCache, deleteCachePattern } from '@/lib/redis/cache';

// Default action is a soft-delete: flip status to DELETED, touch nothing
// else. That's non-destructive by construction regardless of history, so it
// needs no guard -- it never removes a Tenancy or Application row.
//
// Hard-delete (true removal, cascading through PropertyImage/Application/
// Tenancy) is opt-in via ?hard=true, and is only reachable once the guard
// below confirms there is zero lease/application history to lose -- it is
// never the default, and a client-side confirm() is not a substitute for
// this check.
export const DELETE = withAuth(['ADMIN'])(
  async (request, context) => {
    const { id } = context.params as { id: string };
    const hard = new URL(request.url).searchParams.get('hard') === 'true';

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (hard) {
      const [activeTenancies, openApplications] = await Promise.all([
        prisma.tenancy.count({ where: { property_id: id, status: 'ACTIVE' } }),
        prisma.application.count({ where: { property_id: id, status: { in: ['PENDING', 'REVIEWING'] } } }),
      ]);

      if (activeTenancies > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot permanently delete a property with an active tenancy',
            code: 'ACTIVE_TENANCY_EXISTS',
          },
          { status: 409 }
        );
      }
      if (openApplications > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot permanently delete a property with open applications',
            code: 'OPEN_APPLICATIONS_EXIST',
          },
          { status: 409 }
        );
      }

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
        metadata: { hard: true },
      });

      return NextResponse.json({ success: true, data: { hard: true } });
    }

    await prisma.property.update({ where: { id }, data: { status: 'DELETED' } });

    await Promise.all([
      deleteCachePattern('public:properties:*'),
      deleteCache('public:stats'),
    ]);

    await logAudit({
      action: AUDIT_ACTIONS.PROPERTY_DELETED,
      entityType: 'Property',
      entityId: id,
      metadata: { hard: false },
    });

    return NextResponse.json({ success: true, data: { hard: false, status: 'DELETED' } });
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
