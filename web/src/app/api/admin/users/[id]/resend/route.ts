import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { auditFromRequest, writeAuditLog } from '@/lib/auditLog';
import { adminUserHasStatus, normalizeAdminUserStatus } from '@/lib/adminUsers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'users:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      isActive: true,
      ...(adminUserHasStatus ? { status: true } : {}),
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
  }

  const isPending = adminUserHasStatus
    ? normalizeAdminUserStatus(user.status, user.isActive) === 'PENDING'
    : !user.isActive;

  if (!isPending) {
    return NextResponse.json({ error: 'Only pending invitations can be resent.' }, { status: 400 });
  }

  await writeAuditLog({
    ...auditFromRequest(auth.session.userId, 'admin_invite_resend_placeholder', 'adminUser', request),
    action: 'admin_invite_resend_placeholder',
    entityType: 'adminUser',
    entityId: user.id,
    newValue: { email: user.email },
  });

  return NextResponse.json({
    success: true,
    message: 'Invite is ready to resend when email delivery is configured.',
  });
}
