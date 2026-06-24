import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';

const BUCKET = 'property-images';

export const DELETE = withAuth(['LANDLORD'])(
  async (_request, context, user) => {
    const { id, imageId } = context.params as { id: string; imageId: string };

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const image = await prisma.propertyImage.findUnique({ where: { id: imageId } });
    if (!image || image.property_id !== id) {
      return NextResponse.json(
        { success: false, error: 'Image not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await supabaseAdmin.storage.from(BUCKET).remove([image.storage_path]);
    await prisma.propertyImage.delete({ where: { id: imageId } });

    if (image.is_primary) {
      const nextImage = await prisma.propertyImage.findFirst({
        where: { property_id: id },
        orderBy: { display_order: 'asc' },
      });
      if (nextImage) {
        await prisma.propertyImage.update({
          where: { id: nextImage.id },
          data: { is_primary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  }
);

export const PATCH = withAuth(['LANDLORD'])(
  async (_request, context, user) => {
    const { id, imageId } = context.params as { id: string; imageId: string };

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const image = await prisma.propertyImage.findUnique({ where: { id: imageId } });
    if (!image || image.property_id !== id) {
      return NextResponse.json(
        { success: false, error: 'Image not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.propertyImage.updateMany({
        where: { property_id: id },
        data: { is_primary: false },
      }),
      prisma.propertyImage.update({
        where: { id: imageId },
        data: { is_primary: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  }
);
