import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['LANDLORD'])(
  async (_request, context, user) => {
    const { conversationId } = context.params as { conversationId: string };

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        tenant: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
      },
    });

    if (!conversation || conversation.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await prisma.message.updateMany({
      where: { conversation_id: conversationId, sender_id: { not: user.id }, read_at: null },
      data: { read_at: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { sent_at: 'asc' },
    });

    return NextResponse.json({ success: true, data: { conversation, messages } });
  }
);

export const POST = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { conversationId } = context.params as { conversationId: string };

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Message body is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversation_id: conversationId, sender_id: user.id, body: text },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { last_message_at: new Date() },
      }),
      prisma.message.updateMany({
        where: { conversation_id: conversationId, sender_id: { not: user.id }, read_at: null },
        data: { read_at: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  }
);
