import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { sendWelcomeEmail } from '@/lib/email/templates';
import { sendWhatsAppWelcome } from '@/lib/whatsapp/templates';

const registerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['TENANT', 'LANDLORD']),
  phone: z.string().min(4).max(20),
  whatsapp: z.string().min(4).max(20),
  city: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  countryCode: z.string().min(1).max(6),
  whatsappCountryCode: z.string().min(1).max(6),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { name, email, password, role, phone, whatsapp, city, district, countryCode, whatsappCountryCode } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists', code: 'DUPLICATE' },
      { status: 409 }
    );
  }

  const fullPhone = `${countryCode}${phone}`;
  const fullWhatsapp = `${whatsappCountryCode}${whatsapp}`;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      status: 'PENDING',
      kyc_status: 'NOT_SUBMITTED',
      registration_paid: false,
      phone: fullPhone,
      whatsapp: fullWhatsapp,
      city,
      district,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { success: false, error: createError?.message ?? 'Failed to create account', code: 'AUTH_ERROR' },
      { status: 400 }
    );
  }

  try {
    await prisma.user.create({
      data: {
        id: created.user.id,
        email,
        name,
        phone: fullPhone,
        role,
        status: 'PENDING',
        kyc_status: 'NOT_SUBMITTED',
        city,
        district,
      },
    });
  } catch (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { success: false, error: 'Failed to create account', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  sendWelcomeEmail({ name, email, role, phone: fullPhone }).catch((error) =>
    console.error('[register] Welcome email failed', error)
  );
  sendWhatsAppWelcome({ phone: fullWhatsapp, name, role }).catch((error) =>
    console.error('[register] Welcome WhatsApp failed', error)
  );

  return NextResponse.json(
    { success: true, data: { id: created.user.id, email, role } },
    { status: 201 }
  );
}
