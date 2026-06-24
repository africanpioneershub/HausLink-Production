import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const POST = withAuth(['TENANT'])(
  async (_request, context, user) => {
    const { id } = context.params as { id: string };

    const application = await prisma.application.findUnique({ where: { id } });

    if (!application || application.tenant_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING' && application.status !== 'REVIEWING') {
      return NextResponse.json(
        { success: false, error: 'Application cannot be withdrawn', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
