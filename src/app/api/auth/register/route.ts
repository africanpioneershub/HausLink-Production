import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, updateAppMetadata } from '@/lib/supabase/admin';
import { supabasePublicAuth } from '@/lib/supabase/publicAuth';
import { serializeAuthError, withAuthRetry } from '@/lib/supabase/authError';
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

  let userId: string;
  try {
    // supabaseAdmin.auth.admin.createUser() never sends a confirmation email,
    // regardless of email_confirm — it only marks the row's confirmation
    // state. signUp() is what actually triggers Supabase Auth's confirmation
    // email (relayed through Resend at the project's SMTP layer) with a link
    // back to emailRedirectTo.
    //
    // options.data below can ONLY ever write to user_metadata — GoTrue's
    // public signUp endpoint has no way to set app_metadata, which is meant
    // to be server/admin-writable only. So only non-authorization profile
    // fields (name/phone/whatsapp/city/district) go here;
    // role/status/kyc_status/registration_paid are set immediately after via
    // a privileged admin call, below.
    const result = await withAuthRetry(() =>
      supabasePublicAuth.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://hauselink.com/auth/confirm',
          data: {
            name,
            phone: fullPhone,
            whatsapp: fullWhatsapp,
            city,
            district,
          },
        },
      })
    );

    if (result.error || !result.data.user) {
      console.error('[register] supabase.auth.signUp returned an error', {
        email,
        error: serializeAuthError(result.error),
      });
      return NextResponse.json(
        { success: false, error: result.error?.message ?? 'Failed to create account', code: 'AUTH_ERROR' },
        { status: 400 }
      );
    }

    userId = result.data.user.id;
  } catch (authError) {
    console.error('[register] supabase.auth.signUp threw an exception', {
      email,
      error: serializeAuthError(authError),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to reach the authentication service. Please try again.', code: 'AUTH_UNREACHABLE' },
      { status: 502 }
    );
  }

  try {
    await updateAppMetadata(userId, {
      role,
      status: 'PENDING',
      kyc_status: 'NOT_SUBMITTED',
      registration_paid: false,
    });
  } catch (metadataError) {
    console.error('[register] Failed to set app_metadata, rolling back auth user', {
      email,
      userId,
      error: metadataError,
    });
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (rollbackError) {
      console.error('[register] Failed to roll back auth user after app_metadata error', {
        userId,
        error: rollbackError,
      });
    }
    return NextResponse.json(
      { success: false, error: 'Account creation failed. Please try again.', code: 'AUTH_METADATA_ERROR' },
      { status: 500 }
    );
  }

  try {
    await prisma.user.create({
      data: {
        id: userId,
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
      userId,
      error: dbError,
    });
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (rollbackError) {
      console.error('[register] Failed to roll back auth user after DB error', {
        userId,
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
    { success: true, data: { id: userId, email, role } },
    { status: 201 }
  );
}
