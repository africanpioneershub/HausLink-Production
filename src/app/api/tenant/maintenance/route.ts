import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const createMaintenanceSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10).max(2000),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'APPLIANCE', 'CLEANING', 'SECURITY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  photo_urls: z.array(z.string().url()).max(3).optional(),
});

export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { tenant_id: user.id },
      orderBy: { created_at: 'desc' },
      include: { property: { select: { title: true } } },
    });

    return NextResponse.json({ success: true, data: requests });
  }
);

export const POST = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const tenancy = await prisma.tenancy.findFirst({
      where: { tenant_id: user.id, status: 'ACTIVE' },
    });

    if (!tenancy) {
      return NextResponse.json(
        { success: false, error: 'No active tenancy', code: 'NO_TENANCY' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createMaintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const created = await prisma.maintenanceRequest.create({
      data: {
        tenant_id: user.id,
        landlord_id: tenancy.landlord_id,
        property_id: tenancy.property_id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        photo_urls: parsed.data.photo_urls ?? [],
      },
      include: { property: { select: { title: true } } },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }
);
