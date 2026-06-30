import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return NextResponse.json({
    'x-forwarded-for': forwarded,
    'x-real-ip': realIp,
    'first-ip': forwarded?.split(',')[0]?.trim(),
  });
}
