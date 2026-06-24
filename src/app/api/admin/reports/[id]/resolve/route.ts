import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

const resolveSchema = z.object({ action: z.enum(['RESOLVED', 'DISMISSED']) });

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const report = await prisma.reportFlag.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.reportFlag.update({
      where: { id },
      data: { status: parsed.data.action, resolved_at: new Date() },
    });

    await logAudit({
      action:
        parsed.data.action === 'RESOLVED'
          ? AUDIT_ACTIONS.REPORT_RESOLVED
          : AUDIT_ACTIONS.REPORT_DISMISSED,
      entityType: 'ReportFlag',
      entityId: id,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
