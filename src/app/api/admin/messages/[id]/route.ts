import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async (_request, context) => {
    const { id } = context.params as { id: string };

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: id },
      orderBy: { sent_at: 'asc' },
    });

    return NextResponse.json({ success: true, data: { conversation, messages } });
  }
);
