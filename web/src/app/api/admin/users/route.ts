import { NextRequest, NextResponse } from 'next/server';
import { AdminRole, Prisma } from '@prisma/client';
import type { AdminUserStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { auditFromRequest, writeAuditLog } from '@/lib/auditLog';
import { hashPassword } from '@/lib/password';
import { adminUserHasPhone, adminUserHasStatus, adminUserSelect, serializeAdminUser } from '@/lib/adminUsers';
import { listAdminUsersForManagement } from '@/lib/adminUsers.server';

export const dynamic = 'force-dynamic';

const optionalStringSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Admin name is required'),
  email: z.string().trim().email('Please enter a valid email address'),
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be 32 characters or less')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens'),
  role: z.enum(['OWNER', 'MANAGER', 'DISPATCHER', 'FINANCE', 'VIEWER']).default('VIEWER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  password: z.string().min(8, 'Temporary password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  phone: optionalStringSchema,
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords must match',
});

function assertCanManageUsers(role: string) {
  return hasPermission(role, 'users:write');
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!assertCanManageUsers(auth.session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await listAdminUsersForManagement();

  return NextResponse.json({
    success: true,
    data: users.map(serializeAdminUser),
    currentUserId: auth.session.userId,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!assertCanManageUsers(auth.session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const username = parsed.data.username.toLowerCase();
    const existing = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
      select: {
        email: true,
        username: true,
      },
    });
    if (existing) {
      const message = existing.email.toLowerCase() === email
        ? 'An admin with this email already exists.'
        : 'An admin with this username already exists.';
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const createData: Prisma.AdminUserCreateInput = {
      name: parsed.data.name,
      email,
      username,
      passwordHash,
      role: parsed.data.role as AdminRole,
      isActive: parsed.data.status === 'ACTIVE',
    };

    if (adminUserHasStatus) createData.status = parsed.data.status as AdminUserStatus;
    if (adminUserHasPhone) createData.phone = parsed.data.phone ?? null;

    const user = await prisma.adminUser.create({
      data: createData,
      select: adminUserSelect,
    });

    await writeAuditLog({
      ...auditFromRequest(auth.session.userId, 'admin_user_created', 'adminUser', request),
      action: 'admin_user_created',
      entityType: 'adminUser',
      entityId: user.id,
      newValue: {
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: serializeAdminUser(user).status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admin user created.',
        data: serializeAdminUser(user),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create admin user error:', error);

    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'An admin with this email or username already exists.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Could not create admin user.' }, { status: 500 });
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
