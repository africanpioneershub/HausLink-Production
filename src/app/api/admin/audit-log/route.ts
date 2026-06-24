import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const PAGE_SIZE = 20;

export const GET = withAuth(['ADMIN'])(
  async (request) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const category = url.searchParams.get('category') ?? undefined;

    const where: Prisma.AuditLogWhereInput = {};
    if (category && category !== 'ALL') where.entity_type = category;

    const [logs, total, categoryRows] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ distinct: ['entity_type'], select: { entity_type: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        pageSize: PAGE_SIZE,
        categories: categoryRows.map((row) => row.entity_type),
      },
    });
  }
);
