import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const newConversationSchema = z.object({
  property_id: z.string().uuid(),
});


export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const conversations = await prisma.conversation.findMany({
      where: { tenant_id: user.id },
      orderBy: { last_message_at: 'desc' },
      include: {
        landlord: { select: { id: true, name: true } },
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
          landlord: conversation.landlord,
          last_message: conversation.messages[0] ?? null,
          unread_count: unreadCount,
        };
      })
    );

    return NextResponse.json({ success: true, data });
  }
);

export const POST = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = newConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { property_id } = parsed.data;

    const tenancy = await prisma.tenancy.findFirst({
      where: { tenant_id: user.id, property_id },
    });
    if (!tenancy) {
      return NextResponse.json(
        { success: false, error: 'No active tenancy for this property', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const existing = await prisma.conversation.findFirst({
      where: { tenant_id: user.id, landlord_id: tenancy.landlord_id, property_id },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    const conversation = await prisma.conversation.create({
      data: {
        tenant_id: user.id,
        landlord_id: tenancy.landlord_id,
        property_id,
      },
    });

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  }
);
