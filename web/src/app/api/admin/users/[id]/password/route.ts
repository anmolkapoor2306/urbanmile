import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { auditFromRequest, writeAuditLog } from '@/lib/auditLog';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords must match',
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'users:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const target = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
    }

    if (target.role === AdminRole.OWNER && auth.session.role !== AdminRole.OWNER) {
      return NextResponse.json({ error: 'Only an owner can reset an owner password.' }, { status: 403 });
    }

    await prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true },
    });

    await prisma.adminSession.deleteMany({ where: { userId: id } });

    await writeAuditLog({
      ...auditFromRequest(auth.session.userId, 'admin_password_reset', 'adminUser', request),
      action: 'admin_password_reset',
      entityType: 'adminUser',
      entityId: target.id,
      newValue: {
        name: target.name,
        email: target.email,
        role: target.role,
        sessionsInvalidated: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Admin password reset. Existing sessions were signed out.' });
  } catch (error) {
    console.error('Reset admin password error:', error);
    return NextResponse.json({ error: 'Could not reset admin password.' }, { status: 500 });
  }
}
