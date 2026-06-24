import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
const BUCKET = 'property-images';

export const GET = withAuth(['LANDLORD'])(
  async (_request, context, user) => {
    const { id } = context.params as { id: string };

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const images = await prisma.propertyImage.findMany({
      where: { property_id: id },
      orderBy: { display_order: 'asc' },
    });

    return NextResponse.json({ success: true, data: images });
  }
);

export const POST = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { id } = context.params as { id: string };

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const existingCount = await prisma.propertyImage.count({ where: { property_id: id } });
    if (existingCount >= MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `Maximum of ${MAX_IMAGES} images allowed`, code: 'LIMIT_REACHED' },
        { status: 400 }
      );
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');

    if (!formData || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File must be JPEG, PNG, or WebP', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File must be 5MB or smaller', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `properties/${user.id}/${id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: 'Failed to upload image', code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

    const image = await prisma.propertyImage.create({
      data: {
        property_id: id,
        storage_path: storagePath,
        cdn_url: publicUrlData.publicUrl,
        is_primary: existingCount === 0,
        display_order: existingCount,
      },
    });

    return NextResponse.json({ success: true, data: image }, { status: 201 });
  }
);
