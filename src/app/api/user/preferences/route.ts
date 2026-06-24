import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const ROLES = ['TENANT', 'LANDLORD', 'ADMIN'] as const;

const updatePreferencesSchema = z.object({
  notification_email: z.boolean().optional(),
  notification_whatsapp: z.boolean().optional(),
  payout_momo_number: z.string().max(20).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

export const GET = withAuth([...ROLES])(
  async (_request, _context, user) => {
    const preferences = await prisma.userPreference.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id },
      update: {},
    });

    return NextResponse.json({ success: true, data: preferences });
  }
);

export const PATCH = withAuth([...ROLES])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const preferences = await prisma.userPreference.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, ...parsed.data },
      update: parsed.data,
    });

    return NextResponse.json({ success: true, data: preferences });
  }
);
