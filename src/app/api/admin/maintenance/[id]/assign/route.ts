import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { sendMaintenanceUpdateEmail } from '@/lib/email/templates';
import { sendWhatsAppMaintenanceUpdate } from '@/lib/whatsapp/templates';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!maintenanceRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note : undefined;

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await logAudit({
      action: AUDIT_ACTIONS.MAINTENANCE_ASSIGNED,
      entityType: 'MaintenanceRequest',
      entityId: id,
      adminId: admin.id,
      userId: maintenanceRequest.tenant_id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: note ? { note } : undefined,
    });

    const tenant = await prisma.user.findUnique({ where: { id: maintenanceRequest.tenant_id } });
    if (tenant) {
      sendMaintenanceUpdateEmail({
        tenantName: tenant.name ?? 'there',
        tenantEmail: tenant.email,
        requestTitle: maintenanceRequest.title,
        status: updated.status,
        note,
      }).catch((error) => console.error('[maintenance assign] Email failed', error));

      const whatsappPhone = tenant.whatsapp ?? tenant.phone;
      if (whatsappPhone) {
        sendWhatsAppMaintenanceUpdate({
          phone: whatsappPhone,
          tenantName: tenant.name ?? 'there',
          requestTitle: maintenanceRequest.title,
          status: updated.status,
          note,
        }).catch((error) => console.error('[maintenance assign] WhatsApp failed', error));
      }
    }

    return NextResponse.json({ success: true, data: updated });
  }
);
