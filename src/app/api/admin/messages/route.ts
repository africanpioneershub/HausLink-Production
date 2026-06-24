import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [conversations, totalConversations, messagesToday, flaggedCount, supportTickets] =
      await Promise.all([
        prisma.conversation.findMany({
          orderBy: { last_message_at: 'desc' },
          include: {
            tenant: { select: { id: true, name: true, email: true } },
            landlord: { select: { id: true, name: true, email: true } },
            property: { select: { id: true, title: true } },
            messages: { orderBy: { sent_at: 'desc' }, take: 1 },
          },
        }),
        prisma.conversation.count(),
        prisma.message.count({ where: { sent_at: { gte: startOfDay } } }),
        prisma.conversation.count({ where: { flagged_at: { not: null } } }),
        prisma.conversation.count({ where: { flagged_at: { not: null }, status: 'ACTIVE' } }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        conversations: conversations.map((c) => ({
          id: c.id,
          tenant: c.tenant,
          landlord: c.landlord,
          property: c.property,
          last_message: c.messages[0] ?? null,
          flagged_at: c.flagged_at,
          flagged_reason: c.flagged_reason,
        })),
        kpis: { totalConversations, messagesToday, flaggedCount, supportTickets },
      },
    });
  }
);
