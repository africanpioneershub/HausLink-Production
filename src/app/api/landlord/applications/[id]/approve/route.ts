import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { sendApplicationStatusEmail } from '@/lib/email/templates';
import { sendWhatsAppApplicationStatus } from '@/lib/whatsapp/templates';

// Thrown when the property's conditional update finds it's no longer ACTIVE
// -- distinct from Prisma's own P2025 (which the application's conditional
// update raises) so the two race outcomes can be reported with the right
// message.
class PropertyNotAvailableError extends Error {}

export const POST = withAuth(['LANDLORD'])(
  async (_request, context, user) => {
    const { id } = context.params as { id: string };

    const application = await prisma.application.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!application || application.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING' && application.status !== 'REVIEWING') {
      return NextResponse.json(
        { success: false, error: 'Application cannot be approved', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    let updatedApplication;
    let tenancy;
    try {
      [updatedApplication, tenancy] = await prisma.$transaction(async (tx) => {
        // Both updates below are conditional on the row's current state, and
        // that condition is what closes the race -- not the earlier reads
        // above, which only reflect state as of before the transaction
        // started. Postgres locks each row as its UPDATE runs; a second,
        // concurrent approval (of this same application, or of a different
        // application on the same property) blocks until the first commits,
        // then re-evaluates its own WHERE clause against the now-committed
        // row and finds it no longer matches -- Prisma surfaces that as
        // P2025 (RecordNotFound), which we turn into a 409 below.
        const updatedApplication = await tx.application.update({
          where: { id, status: { in: ['PENDING', 'REVIEWING'] } },
          data: { status: 'APPROVED', reviewed_at: new Date() },
        });

        const updatedProperty = await tx.property
          .update({
            where: { id: application.property_id, status: 'ACTIVE' },
            data: { status: 'OCCUPIED' },
          })
          .catch((error) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
              throw new PropertyNotAvailableError();
            }
            throw error;
          });

        const tenancy = await tx.tenancy.create({
          data: {
            tenant_id: application.tenant_id,
            landlord_id: application.landlord_id,
            property_id: updatedProperty.id,
            rent_rwf: application.property.rent_rwf,
            deposit_rwf: application.property.deposit_rwf,
            start_date: startDate,
            end_date: endDate,
          },
        });

        return [updatedApplication, tenancy] as const;
      });
    } catch (error) {
      if (error instanceof PropertyNotAvailableError) {
        return NextResponse.json(
          { success: false, error: 'This property is no longer available', code: 'PROPERTY_UNAVAILABLE' },
          { status: 409 }
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'This application has already been reviewed', code: 'ALREADY_REVIEWED' },
          { status: 409 }
        );
      }
      throw error;
    }

    const tenant = await prisma.user.findUnique({ where: { id: application.tenant_id } });
    if (tenant) {
      sendApplicationStatusEmail({
        tenantName: tenant.name ?? 'there',
        tenantEmail: tenant.email,
        propertyTitle: application.property.title,
        status: 'APPROVED',
      }).catch((error) => console.error('[application approve] Email failed', error));

      const whatsappPhone = tenant.whatsapp ?? tenant.phone;
      if (whatsappPhone) {
        sendWhatsAppApplicationStatus({
          phone: whatsappPhone,
          tenantName: tenant.name ?? 'there',
          propertyTitle: application.property.title,
          status: 'APPROVED',
        }).catch((error) => console.error('[application approve] WhatsApp failed', error));
      }
    }

    return NextResponse.json({
      success: true,
      data: { application: updatedApplication, tenancy },
    });
  }
);
