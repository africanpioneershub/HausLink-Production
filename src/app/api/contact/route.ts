import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendContactFormEmail } from '@/lib/email/templates';
import { sendWhatsAppContactConfirmation } from '@/lib/whatsapp/templates';
import { contactRateLimit, applyRateLimit } from '@/lib/redis/ratelimit';
import { sanitizeObject } from '@/lib/sanitize';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Enter a valid email address'),
  subject: z.string().min(2, 'Subject must be at least 2 characters').max(150),
  message: z.string().min(5, 'Message must be at least 5 characters').max(5000),
  phone: z.string().min(4).max(20).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success: withinLimit } = await applyRateLimit(contactRateLimit, ip);
  if (!withinLimit) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input';
    return NextResponse.json(
      { success: false, error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { name, email, subject, message, phone } = sanitizeObject(parsed.data as Record<string, unknown>) as typeof parsed.data;

  const emailSent = await sendContactFormEmail({ name, email, subject, message }).catch((error) => {
    console.error('[contact] Email failed', error);
    return false;
  });

  if (phone) {
    sendWhatsAppContactConfirmation({ phone, name }).catch((error) =>
      console.error('[contact] WhatsApp failed', error)
    );
  }

  if (!emailSent) {
    return NextResponse.json(
      { success: false, error: 'Failed to send your message. Please try again.', code: 'EMAIL_SEND_FAILED' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
