import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { adminUserOrderBy, adminUserSelect, type AdminUserRecord } from '@/lib/adminUsers';

export async function listAdminUsersForManagement() {
  try {
    const query = {
      select: adminUserSelect,
      ...(adminUserOrderBy ? { orderBy: adminUserOrderBy } : {}),
    };

    return await prisma.adminUser.findMany(query) as AdminUserRecord[];
  } catch (error) {
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.warn('Admin user ordered query failed; retrying without orderBy.');
      return prisma.adminUser.findMany({
        select: adminUserSelect,
      }) as Promise<AdminUserRecord[]>;
    }

    throw error;
  }
}
