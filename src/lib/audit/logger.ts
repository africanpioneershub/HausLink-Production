import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { AUDIT_ACTIONS } from '@/lib/constants';

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  adminId?: string;
  userId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        admin_id: params.adminId,
        user_id: params.userId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        ip_address: params.ipAddress,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error('[AuditLogger Error]', error);
  }
}
