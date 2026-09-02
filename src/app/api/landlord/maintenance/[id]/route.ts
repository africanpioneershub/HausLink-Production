import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { sendMaintenanceUpdateEmail } from '@/lib/email/templates';
import { sendWhatsAppMaintenanceUpdate } from '@/lib/whatsapp/templates';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const PATCH = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { id } = context.params as { id: string };

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!maintenanceRequest || maintenanceRequest.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolved_at: parsed.data.status === 'RESOLVED' ? new Date() : maintenanceRequest.resolved_at,
      },
    });

    // The admin-only "assign" action already notified the tenant on its
    // own status change; this is the actual landlord-facing path every
    // maintenance request normally goes through, and it never notified
    // anyone -- same non-blocking fire-and-forget pattern as everywhere
    // else notifications are sent from a request path.
    if (updated.status !== maintenanceRequest.status) {
      const tenant = await prisma.user.findUnique({ where: { id: maintenanceRequest.tenant_id } });
      if (tenant) {
        sendMaintenanceUpdateEmail({
          tenantName: tenant.name ?? 'there',
          tenantEmail: tenant.email,
          requestTitle: maintenanceRequest.title,
          status: updated.status,
        }).catch((error) => console.error('[landlord maintenance update] Email failed', error));

        const whatsappPhone = tenant.whatsapp ?? tenant.phone;
        if (whatsappPhone) {
          sendWhatsAppMaintenanceUpdate({
            phone: whatsappPhone,
            tenantName: tenant.name ?? 'there',
            requestTitle: maintenanceRequest.title,
            status: updated.status,
          }).catch((error) => console.error('[landlord maintenance update] WhatsApp failed', error));
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
  }
);
