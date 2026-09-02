import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin, updateAppMetadata } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';

export const GET = withAuth(['ADMIN'])(
  async (request) => {
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') ?? 'ALL';
    const search = url.searchParams.get('search') ?? undefined;

    const where: Prisma.UserWhereInput = {};
    if (tab === 'LANDLORDS') where.role = 'LANDLORD';
    else if (tab === 'TENANTS') where.role = 'TENANT';
    else if (tab === 'ADMINS') where.role = 'ADMIN';
    else if (tab === 'PENDING') where.status = 'PENDING';

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [fetchedUsers, allUsers, landlords, activeRenters, needsReview, platformManagers] =
      await Promise.all([
        prisma.user.findMany({ where, orderBy: { created_at: 'desc' } }),
        prisma.user.count(),
        prisma.user.count({ where: { role: 'LANDLORD' } }),
        prisma.user.count({ where: { role: 'TENANT', status: 'ACTIVE' } }),
        prisma.user.count({ where: { OR: [{ status: 'PENDING' }, { kyc_status: 'PENDING' }] } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
      ]);

    let users = fetchedUsers;
    if (tab === 'PENDING') {
      const checked = await Promise.all(
        fetchedUsers.map(async (u) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(u.id);
          return { user: u, emailVerified: !!data.user?.email_confirmed_at };
        })
      );
      users = checked.filter((c) => c.emailVerified).map((c) => c.user);
    }

    return NextResponse.json({
      success: true,
      data: {
        users,
        kpis: { allUsers, landlords, activeRenters, needsReview, platformManagers },
      },
    });
  }
);

const updateStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['ACTIVE', 'PENDING', 'REJECTED', 'BANNED', 'SUSPENDED']),
});

export const PATCH = withAuth(['ADMIN'])(
  async (request, _context, admin) => {
    const body = await request.json().catch(() => null);
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { userId, status } = parsed.data;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { status } });

    await updateAppMetadata(userId, { status });

    await deleteCache(CACHE_KEYS.userProfile(userId));

    await logAudit({
      action: AUDIT_ACTIONS.USER_STATUS_UPDATED,
      entityType: 'User',
      entityId: userId,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: { newStatus: status },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
