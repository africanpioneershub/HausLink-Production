import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const saved = await prisma.savedProperty.findMany({
      where: { tenant_id: user.id },
      orderBy: { saved_at: 'desc' },
      include: { property: true },
    });

    return NextResponse.json({ success: true, data: saved });
  }
);

export const POST = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const body = await request.json().catch(() => null);
    const propertyId = typeof body?.property_id === 'string' ? body.property_id : undefined;

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'property_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const saved = await prisma.savedProperty.upsert({
      where: { tenant_id_property_id: { tenant_id: user.id, property_id: propertyId } },
      create: { tenant_id: user.id, property_id: propertyId },
      update: {},
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  }
);

export const DELETE = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get('property_id');

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'property_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await prisma.savedProperty.deleteMany({
      where: { tenant_id: user.id, property_id: propertyId },
    });

    return NextResponse.json({ success: true, data: { property_id: propertyId } });
  }
);
