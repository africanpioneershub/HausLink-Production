import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async (_request, context) => {
    const { documentId } = context.params as { documentId: string };

    const document = await prisma.kYCDocument.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from('kyc-documents')
      .createSignedUrl(document.storage_path, 60);

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate signed URL', code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { url: data.signedUrl } });
  }
);
