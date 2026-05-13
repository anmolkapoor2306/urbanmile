import type { AdminRole, AdminUserStatus, Prisma } from '@prisma/client';

export const adminUserHasStatus = false;
export const adminUserHasPhone = false;

export const adminUserOrderBy = [
  { createdAt: 'desc' },
] satisfies Prisma.AdminUserOrderByWithRelationInput[];

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  isActive: true,
  lastLoginAt: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdminUserSelect;

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  username: string;
  role?: AdminRole | null;
  status?: AdminUserStatus | null;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type SerializedAdminUser = ReturnType<typeof serializeAdminUser>;

export function serializeAdminUser(user: AdminUserRecord) {
  const status = normalizeAdminUserStatus(user.status, user.isActive);
  const role = user.role ?? 'VIEWER';

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role,
    status,
    phone: user.phone,
    isActive: status === 'ACTIVE',
    lastActive: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    addedOn: user.createdAt ? user.createdAt.toISOString() : null,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
  };
}

export function normalizeAdminUserStatus(status: AdminUserStatus | string | null | undefined, isActive: boolean) {
  if (status === 'PENDING' || status === 'INACTIVE') return status;
  return isActive ? 'ACTIVE' : 'INACTIVE';
}

export function getAdminRoleLabel(role: AdminRole | string) {
  if (!role) return 'Admin';

  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'MANAGER':
      return 'Manager';
    case 'DISPATCHER':
      return 'Dispatcher';
    case 'FINANCE':
      return 'Finance';
    case 'VIEWER':
      return 'Viewer';
    default:
      return String(role);
  }
}

export function getAdminStatusLabel(status: AdminUserStatus | string) {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    default:
      return String(status);
  }
}
