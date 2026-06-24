import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, type PlatformConfig } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';

const FALLBACK_CONFIG: PlatformConfig = {
  id: 'singleton',
  platform_name: 'HausLink',
  support_email: 'support@hauslink.rw',
  support_whatsapp: '+250788000000',
  is_live: false,
  allow_registrations: true,
  require_listing_approval: true,
  tenant_monthly_rwf: 5000,
  landlord_registration_rwf: 10000,
  transaction_fee_pct: new Prisma.Decimal(0.02),
  featured_listing_monthly_rwf: 25000,
  featured_listing_weekly_rwf: 10000,
  notification_settings: {},
  security_settings: {},
  updated_at: new Date(),
};

export const GET = withAuth(['ADMIN'])(
  async () => {
    let config: PlatformConfig = FALLBACK_CONFIG;

    try {
      config = await prisma.platformConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton' },
        update: {},
      });
    } catch (error) {
      console.error('[admin/settings] DB error:', error);
    }

    return NextResponse.json({ success: true, data: config });
  }
);

const updateSettingsSchema = z.object({
  platform_name: z.string().min(2).optional(),
  support_email: z.string().email().optional(),
  support_whatsapp: z.string().optional(),
  is_live: z.boolean().optional(),
  allow_registrations: z.boolean().optional(),
  require_listing_approval: z.boolean().optional(),
  tenant_monthly_rwf: z.number().int().positive().optional(),
  landlord_registration_rwf: z.number().int().positive().optional(),
  transaction_fee_pct: z.number().min(0).max(1).optional(),
  featured_listing_monthly_rwf: z.number().int().positive().optional(),
  featured_listing_weekly_rwf: z.number().int().positive().optional(),
  notification_settings: z.record(z.string(), z.unknown()).optional(),
  security_settings: z.record(z.string(), z.unknown()).optional(),
});

export const PATCH = withAuth(['ADMIN'])(
  async (request, _context, admin) => {
    const body = await request.json().catch(() => null);
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { notification_settings, security_settings, ...rest } = parsed.data;
    const jsonFields = {
      ...(notification_settings
        ? { notification_settings: notification_settings as Prisma.InputJsonValue }
        : {}),
      ...(security_settings ? { security_settings: security_settings as Prisma.InputJsonValue } : {}),
    };

    let updated: PlatformConfig;
    try {
      updated = await prisma.platformConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...rest, ...jsonFields },
        update: { ...rest, ...jsonFields },
      });
    } catch (error) {
      console.error('[admin/settings] PATCH DB error:', error);
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable. Please try again.', code: 'DB_UNAVAILABLE' },
        { status: 503 }
      );
    }

    await deleteCache(CACHE_KEYS.platformConfig());

    await logAudit({
      action: AUDIT_ACTIONS.PLATFORM_CONFIG_UPDATED,
      entityType: 'PlatformConfig',
      entityId: 'singleton',
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
