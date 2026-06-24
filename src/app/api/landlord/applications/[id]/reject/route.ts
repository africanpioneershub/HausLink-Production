import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const POST = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { id } = context.params as { id: string };

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application || application.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING' && application.status !== 'REVIEWING') {
      return NextResponse.json(
        { success: false, error: 'Application cannot be rejected', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'A rejection reason is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'REJECTED', reviewed_at: new Date(), notes: reason },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
