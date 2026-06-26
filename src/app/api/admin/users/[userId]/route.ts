import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async (_request, context) => {
    const { userId } = context.params as { userId: string };

    const [user, propertyCount, applicationCount, recentAudit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          kyc_status: true,
          city: true,
          district: true,
          phone: true,
          created_at: true,
        },
      }),
      prisma.property.count({ where: { landlord_id: userId } }),
      prisma.application.count({ where: { tenant_id: userId } }),
      prisma.auditLog.findMany({
        where: { entity_id: userId },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, action: true, entity_type: true, created_at: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user, propertyCount, applicationCount, recentAudit },
    });
  }
);
