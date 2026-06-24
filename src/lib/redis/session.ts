import { redis } from './client';
import { SESSION_TTL_SECONDS } from '@/lib/constants';
import type { UserRole, KYCStatus } from '@/types';

export interface SessionData {
  userId: string;
  role: UserRole;
  kycStatus: KYCStatus;
  registrationPaid: boolean;
  twoFaVerified: boolean;
}

export async function setSession(
  sessionId: string,
  data: SessionData
): Promise<void> {
  await redis.set(`session:${sessionId}`, data, { ex: SESSION_TTL_SECONDS });
}

export async function getSession(
  sessionId: string
): Promise<SessionData | null> {
  return redis.get<SessionData>(`session:${sessionId}`);
}

export async function destroySession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

export async function extendSession(sessionId: string): Promise<void> {
  await redis.expire(`session:${sessionId}`, SESSION_TTL_SECONDS);
}

export async function setAdminTwoFa(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (session) {
    await setSession(sessionId, { ...session, twoFaVerified: true });
  }
}