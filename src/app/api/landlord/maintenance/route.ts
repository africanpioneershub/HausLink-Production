import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const createRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'APPLIANCE', 'CLEANING', 'SECURITY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  property_id: z.string().uuid(),
});


export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { landlord_id: user.id },
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });

    const kpis = {
      total: requests.length,
      open: requests.filter((r) => r.status === 'PENDING').length,
      inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
      resolved: requests.filter((r) => r.status === 'RESOLVED').length,
      emergency: requests.filter(
        (r) => r.priority === 'EMERGENCY' && r.status !== 'RESOLVED' && r.status !== 'CLOSED'
      ).length,
    };

    return NextResponse.json({ success: true, data: { requests, kpis } });
  }
);

export const POST = withAuth(['LANDLORD'])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { title, description, category, priority, property_id } = parsed.data;

    const property = await prisma.property.findFirst({ where: { id: property_id, landlord_id: user.id } });
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const tenancy = await prisma.tenancy.findFirst({
      where: { property_id, landlord_id: user.id },
      orderBy: { created_at: 'desc' },
    });
    if (!tenancy) {
      return NextResponse.json(
        { success: false, error: 'No tenancy found for this property', code: 'NO_TENANCY' },
        { status: 400 }
      );
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        title,
        description,
        category,
        priority,
        property_id,
        landlord_id: user.id,
        tenant_id: tenancy.tenant_id,
      },
    });

    return NextResponse.json({ success: true, data: maintenanceRequest }, { status: 201 });
  }
);
