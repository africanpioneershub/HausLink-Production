import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { sendKYCSubmittedAdminEmail } from '@/lib/email/templates';
import { AUDIT_ACTIONS } from '@/lib/constants';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;

const metaSchema = z.object({
  documentType: z.enum(['NATIONAL_ID', 'PASSPORT']),
});

export const POST = withAuth(['TENANT', 'LANDLORD'])(
  async (request, _context, authUser) => {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    const parsed = metaSchema.safeParse({
      documentType: formData.get('documentType'),
    });

    if (!parsed.success || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File must be JPG, PNG, or PDF', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File must be 5MB or smaller', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const { documentType } = parsed.data;
    const userId = authUser.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (user.kyc_status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Your identity is already verified', code: 'ALREADY_VERIFIED' },
        { status: 400 }
      );
    }

    // Use a server-generated filename to prevent path injection via client-controlled file.name
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    const safeExt = /^[a-z0-9]{1,10}$/.test(rawExt) ? `.${rawExt}` : '';
    const safeName = `${documentType}_${Date.now()}${safeExt}`;
    const safeEmail = user.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const storagePath = `${safeEmail}/${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('kyc-documents')
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: 'Failed to upload document', code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.kYCDocument.create({
        data: {
          user_id: userId,
          document_type: documentType,
          storage_path: storagePath,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { kyc_status: 'PENDING' },
      });
      return doc;
    });

    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...authUserData.user?.user_metadata, kyc_status: 'PENDING' },
    });

    sendKYCSubmittedAdminEmail({
      userName: user.name ?? user.email,
      userEmail: user.email,
      userRole: user.role,
      documentType,
    }).catch((error) => console.error('[kyc submit] Admin notification failed', error));

    prisma.auditLog.create({
      data: {
        user_id: userId,
        action: AUDIT_ACTIONS.KYC_SUBMITTED,
        entity_type: 'KYCDocument',
        entity_id: document.id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        metadata: { documentType },
      },
    }).catch(() => {});

    return NextResponse.json(
      { success: true, data: { id: document.id, storage_path: storagePath } },
      { status: 201 }
    );
  }
);
