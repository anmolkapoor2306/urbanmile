import prisma from '@/lib/prisma';

export interface AuditLogEntry {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      },
    });
  } catch (err) {
    console.warn('[Audit Log] Failed to write audit log:', err instanceof Error ? err.message : err);
  }
}

export function auditFromRequest(
  adminUserId: string,
  action: string,
  entityType: string,
  request?: Request,
): Omit<AuditLogEntry, 'action' | 'entityType'> {
  const ip = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request?.headers.get('x-real-ip')
    || null;
  const userAgent = request?.headers.get('user-agent') || null;
  return {
    adminUserId,
    entityId: null,
    oldValue: null,
    newValue: null,
    ipAddress: ip,
    userAgent: userAgent,
  };
}
