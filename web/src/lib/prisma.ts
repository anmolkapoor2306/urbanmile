import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (globalForPrisma.prisma && !hasRequiredPrismaDelegates(globalForPrisma.prisma)) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

function hasRequiredPrismaDelegates(client: PrismaClient) {
  return typeof client.booking?.findMany === 'function' &&
    typeof client.serviceArea?.findMany === 'function' &&
    typeof client.serviceControlConfig?.findUnique === 'function';
}
