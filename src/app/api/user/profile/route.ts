import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';

const ROLES = ['TENANT', 'LANDLORD', 'ADMIN'] as const;

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatar_url: z.string().url().optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
});

export const GET = withAuth([...ROLES])(
  async (_request, _context, user) => {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { preferences: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: profile });
  }
);

export const PATCH = withAuth([...ROLES])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
    });

    if (parsed.data.name) {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(user.id);
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...authUserData.user?.user_metadata, name: parsed.data.name },
      });
    }

    await deleteCache(CACHE_KEYS.userProfile(user.id));

    return NextResponse.json({ success: true, data: updated });
  }
);
