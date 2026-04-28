import type { PrismaClient } from '@prisma/client';

type VendorCodeDb = Pick<PrismaClient, 'vendor'>;

function formatCode(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

export async function generateVendorCode(
  db: VendorCodeDb
): Promise<string> {
  const prefix = 'VDR';

   const existingCodes = await db.vendor.findMany({
     where: { id: { not: undefined } },
     select: { id: true },
   });

  const codePattern = new RegExp(`^${prefix}-(\d+)$`);
  const nextSequence =
    existingCodes.reduce((max, { id }) => {
      if (!id) return max;

      const match = id.match(codePattern);
      if (!match) return max;

      const suffix = Number.parseInt(match[1], 10);
      return Number.isNaN(suffix) ? max : Math.max(max, suffix);
    }, 0) + 1;

  return formatCode(prefix, nextSequence);
}