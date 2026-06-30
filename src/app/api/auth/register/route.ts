import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { sendWelcomeEmail } from '@/lib/email/templates';
import { sendWhatsAppWelcome } from '@/lib/whatsapp/templates';
import { authRateLimit, applyRateLimit } from '@/lib/redis/ratelimit';
import { sanitizeObject } from '@/lib/sanitize';

const registerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['TENANT', 'LANDLORD']),
  phone: z.string().min(4).max(20),
  whatsapp: z.string().min(4).max(20),
  city: z.string().max(100).optional(),
  district: z.string().min(1).max(100),
  countryCode: z.string().min(1).max(6),
  whatsappCountryCode: z.string().min(1).max(6),
});

export async function POST(request: Request) {
  try {
    return await handleRegister(request);
  } catch (error) {
    console.error('[register] Unhandled exception in register route', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

async function handleRegister(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success: withinLimit } = await applyRateLimit(authRateLimit, `register:${ip}`);
  if (!withinLimit) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[register] Zod validation failed', parsed.error.flatten());
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const sanitized = sanitizeObject(parsed.data as Record<string, unknown>) as typeof parsed.data;
  const { name, email, password, role, phone, whatsapp, city, district, countryCode, whatsappCountryCode } =
    sanitized;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Don't reveal membership status — return identical response to a real registration.
    // The duplicate is blocked server-side; the caller cannot distinguish this from success.
    console.info('[register] duplicate email attempt suppressed', { email });
    return NextResponse.json(
      {
        success: true,
        data: {
          message:
            'If this email is not already registered, your account has been created. Please check your inbox to verify your email.',
        },
      },
      { status: 201 }
    );
  }

  const fullPhone = `${countryCode}${phone}`;
  const fullWhatsapp = `${whatsappCountryCode}${whatsapp}`;

  let created;
  try {
    const result = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
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

    if (result.error || !result.data.user) {
      console.error('[register] supabaseAdmin.auth.admin.createUser returned an error', {
        email,
        error: result.error,
      });
      return NextResponse.json(
        { success: false, error: result.error?.message ?? 'Failed to create account', code: 'AUTH_ERROR' },
        { status: 400 }
      );
    }

    created = result.data;
  } catch (authError) {
    console.error('[register] supabaseAdmin.auth.admin.createUser threw an exception', {
      email,
      error: authError,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to reach the authentication service. Please try again.', code: 'AUTH_UNREACHABLE' },
      { status: 502 }
    );
  }

  try {
    await prisma.user.create({
      data: {
        id: created.user.id,
        email,
        name,
        phone: fullPhone,
        whatsapp: fullWhatsapp,
        role,
        status: 'PENDING',
        kyc_status: 'NOT_SUBMITTED',
        city: city ?? null,
        district,
      },
    });
  } catch (dbError) {
    console.error('[register] Failed to create Prisma user record, rolling back auth user', {
      email,
      userId: created.user.id,
      error: dbError,
    });
    try {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    } catch (rollbackError) {
      console.error('[register] Failed to roll back auth user after DB error', {
        userId: created.user.id,
        error: rollbackError,
      });
    }
    return NextResponse.json(
      { success: false, error: 'Account creation failed. Please try again.', code: 'DB_ERROR' },
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
