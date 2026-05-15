export const ADMIN_ROLES = ['OWNER', 'MANAGER', 'DISPATCHER', 'FINANCE', 'VIEWER'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  OWNER: 5,
  MANAGER: 4,
  DISPATCHER: 3,
  FINANCE: 3,
  VIEWER: 1,
};

type PermissionKey =
  | 'pricing:read'
  | 'pricing:write'
  | 'tripoverrides:read'
  | 'tripoverrides:write'
  | 'outstation:read'
  | 'outstation:write'
  | 'bookings:read'
  | 'bookings:write'
  | 'dispatch:read'
  | 'dispatch:write'
  | 'drivers:read'
  | 'drivers:write'
  | 'fleet:read'
  | 'fleet:write'
  | 'customers:read'
  | 'customers:write'
  | 'finance:read'
  | 'finance:write'
  | 'reports:read'
  | 'reports:write'
  | 'settings:read'
  | 'settings:write'
  | 'users:write'
  | 'audit:read';

type RolePermissions = Partial<Record<AdminRole, true>>;

const PERMISSION_ROLES: Record<PermissionKey, RolePermissions> = {
  'pricing:read': { OWNER: true, MANAGER: true },
  'pricing:write': { OWNER: true, MANAGER: true },
  'tripoverrides:read': { OWNER: true, MANAGER: true },
  'tripoverrides:write': { OWNER: true, MANAGER: true },
  'outstation:read': { OWNER: true, MANAGER: true },
  'outstation:write': { OWNER: true, MANAGER: true },
  'bookings:read': { OWNER: true, MANAGER: true, DISPATCHER: true, FINANCE: true, VIEWER: true },
  'bookings:write': { OWNER: true, MANAGER: true, DISPATCHER: true },
  'dispatch:read': { OWNER: true, MANAGER: true, DISPATCHER: true },
  'dispatch:write': { OWNER: true, MANAGER: true, DISPATCHER: true },
  'drivers:read': { OWNER: true, MANAGER: true, DISPATCHER: true },
  'drivers:write': { OWNER: true, MANAGER: true },
  'fleet:read': { OWNER: true, MANAGER: true, DISPATCHER: true },
  'fleet:write': { OWNER: true, MANAGER: true },
  'customers:read': { OWNER: true, MANAGER: true },
  'customers:write': { OWNER: true, MANAGER: true },
  'finance:read': { OWNER: true, MANAGER: true, FINANCE: true },
  'finance:write': { OWNER: true },
  'reports:read': { OWNER: true, MANAGER: true, FINANCE: true },
  'reports:write': { OWNER: true },
  'settings:read': { OWNER: true },
  'settings:write': { OWNER: true },
  'users:write': { OWNER: true },
  'audit:read': { OWNER: true, MANAGER: true },
};

export function hasPermission(role: string, permission: PermissionKey): boolean {
  const allowedRoles = PERMISSION_ROLES[permission];
  if (!allowedRoles) return false;
  return role in allowedRoles;
}

export function hasAnyPermission(role: string, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getAdminPermissions(role: string): PermissionKey[] {
  return Object.keys(PERMISSION_ROLES).filter((key) =>
    hasPermission(role, key as PermissionKey)
  ) as PermissionKey[];
}

export type PagePermissionMap = {
  dashboard: PermissionKey[];
  dispatch: PermissionKey[];
  'service-control': PermissionKey[];
  bookings: PermissionKey[];
  drivers: PermissionKey[];
  fleet: PermissionKey[];
  'outstation-pricing': PermissionKey[];
  customers: PermissionKey[];
  finance: PermissionKey[];
  reports: PermissionKey[];
  settings: PermissionKey[];
};

export const PAGE_PERMISSIONS: PagePermissionMap = {
  dashboard: ['bookings:read'],
  dispatch: ['dispatch:read'],
  'service-control': ['dispatch:read'],
  bookings: ['bookings:read'],
  drivers: ['drivers:read'],
  fleet: ['fleet:read'],
  'outstation-pricing': ['pricing:read'],
  customers: ['customers:read'],
  finance: ['finance:read'],
  reports: ['reports:read'],
  settings: ['settings:read'],
};

export function canAccessPage(role: string, page: keyof typeof PAGE_PERMISSIONS): boolean {
  return hasAnyPermission(role, PAGE_PERMISSIONS[page]);
}
