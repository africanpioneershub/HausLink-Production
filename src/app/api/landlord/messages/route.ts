import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const conversations = await prisma.conversation.findMany({
      where: { landlord_id: user.id },
      orderBy: { last_message_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
        messages: { orderBy: { sent_at: 'desc' }, take: 1 },
      },
    });

    const data = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversation_id: conversation.id,
            sender_id: { not: user.id },
            read_at: null,
          },
        });

        return {
          id: conversation.id,
          property: conversation.property,
          tenant: conversation.tenant,
          last_message: conversation.messages[0] ?? null,
          unread_count: unreadCount,
        };
      })
    );

    return NextResponse.json({ success: true, data });
  }
);
