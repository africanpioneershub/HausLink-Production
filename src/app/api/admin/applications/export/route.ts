import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const BATCH_SIZE = 200;

export const GET = withAuth(['ADMIN'])(
  async (request, _context, admin) => {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const header = ['ID', 'Tenant', 'Landlord', 'Property', 'Status', 'Applied At'].join(',') + '\n';
        controller.enqueue(encoder.encode(header));

        let skip = 0;
        for (;;) {
          const batch = await prisma.application.findMany({
            skip,
            take: BATCH_SIZE,
            orderBy: { applied_at: 'desc' },
            include: {
              tenant: { select: { name: true, email: true } },
              landlord: { select: { name: true, email: true } },
              property: { select: { title: true } },
            },
          });

          if (batch.length === 0) break;

          for (const app of batch) {
            const row =
              [
                app.id,
                app.tenant.name ?? app.tenant.email,
                app.landlord.name ?? app.landlord.email,
                app.property.title,
                app.status,
                app.applied_at.toISOString(),
              ]
                .map((value) => escapeCsv(String(value)))
                .join(',') + '\n';
            controller.enqueue(encoder.encode(row));
          }

          skip += BATCH_SIZE;
          if (batch.length < BATCH_SIZE) break;
        }

        controller.close();
      },
    });

    await logAudit({
      action: AUDIT_ACTIONS.APPLICATIONS_EXPORTED,
      entityType: 'Application',
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="applications.csv"',
      },
    });
  }
);
