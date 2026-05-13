import { NextRequest, NextResponse } from 'next/server';
import { AdminRole, Prisma } from '@prisma/client';
import type { AdminUserStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { auditFromRequest, writeAuditLog } from '@/lib/auditLog';
import {
  adminUserHasPhone,
  adminUserHasStatus,
  adminUserSelect,
  serializeAdminUser,
} from '@/lib/adminUsers';

export const dynamic = 'force-dynamic';

const optionalStringSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable().optional());

const updateAdminSchema = z.object({
  name: z.string().trim().min(2, 'Admin name is required').optional(),
  role: z.enum(['OWNER', 'MANAGER', 'DISPATCHER', 'FINANCE', 'VIEWER']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  phone: optionalStringSchema,
});

function assertCanManageUsers(role: string) {
  return hasPermission(role, 'users:write');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!assertCanManageUsers(auth.session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { id }, select: adminUserSelect });
    if (!existing) {
      return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
    }

    if (id === auth.session.userId) {
      if (parsed.data.status && parsed.data.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
      }

      if (parsed.data.role && parsed.data.role !== 'OWNER') {
        return NextResponse.json({ error: 'You cannot remove your own owner access.' }, { status: 400 });
      }
    }

    if (existing.role === 'OWNER' && parsed.data.role && parsed.data.role !== 'OWNER') {
      const ownerCount = await prisma.adminUser.count({ where: { role: AdminRole.OWNER } });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'At least one owner admin must remain.' }, { status: 400 });
      }
    }

    if (existing.role === 'OWNER' && parsed.data.status && parsed.data.status !== 'ACTIVE') {
      const ownerWhere: Prisma.AdminUserWhereInput = {
        role: AdminRole.OWNER,
        isActive: true,
      };
      if (adminUserHasStatus) ownerWhere.status = 'ACTIVE' as AdminUserStatus;

      const activeOwnerCount = await prisma.adminUser.count({
        where: ownerWhere,
      });
      if (activeOwnerCount <= 1) {
        return NextResponse.json({ error: 'At least one active owner admin must remain.' }, { status: 400 });
      }
    }

    const updateData: Prisma.AdminUserUpdateInput = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role as AdminRole;
    if (parsed.data.status !== undefined) {
      if (adminUserHasStatus) updateData.status = parsed.data.status as AdminUserStatus;
      updateData.isActive = parsed.data.status === 'ACTIVE';
    }
    if (adminUserHasPhone && parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

    const updated = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: adminUserSelect,
    });

    if (parsed.data.status && parsed.data.status !== 'ACTIVE') {
      await prisma.adminSession.deleteMany({ where: { userId: id } });
    }

    await writeAuditLog({
      ...auditFromRequest(auth.session.userId, 'admin_user_updated', 'adminUser', request),
      action: 'admin_user_updated',
      entityType: 'adminUser',
      entityId: id,
      oldValue: {
        name: existing.name,
        role: existing.role,
        status: serializeAdminUser(existing).status,
      },
      newValue: {
        name: updated.name,
        role: updated.role,
        status: serializeAdminUser(updated).status,
      },
    });

    return NextResponse.json({ success: true, message: 'Admin user updated.', data: serializeAdminUser(updated) });
  } catch (error) {
    console.error('Update admin user error:', error);
    return NextResponse.json({ error: 'Could not update admin user.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!assertCanManageUsers(auth.session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    if (id === auth.session.userId) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { id }, select: adminUserSelect });
    if (!existing) {
      return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });
    }

    if (existing.role === 'OWNER') {
      const ownerCount = await prisma.adminUser.count({ where: { role: AdminRole.OWNER } });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'At least one owner admin must remain.' }, { status: 400 });
      }
    }

    await prisma.adminUser.delete({ where: { id } });

    await writeAuditLog({
      ...auditFromRequest(auth.session.userId, 'admin_user_deleted', 'adminUser', request),
      action: 'admin_user_deleted',
      entityType: 'adminUser',
      entityId: id,
      oldValue: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
        status: serializeAdminUser(existing).status,
      },
    });

    return NextResponse.json({ success: true, message: 'Admin user removed.' });
  } catch (error) {
    console.error('Delete admin user error:', error);
    return NextResponse.json({ error: 'Could not remove admin user.' }, { status: 500 });
  }
}
