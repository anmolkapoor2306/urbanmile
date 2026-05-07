import { PrismaClient } from '@prisma/client';
import {
  JALANDHAR_OUTSTATION_SEED_ROUTES,
  calculateSuggestedFare,
} from '../src/lib/outstationPricing';

const prisma = new PrismaClient();

async function main() {
  for (const route of JALANDHAR_OUTSTATION_SEED_ROUTES) {
    await prisma.outstationRoute.upsert({
      where: {
        originCity_destinationCity: {
          originCity: route.originCity,
          destinationCity: route.destinationCity,
        },
      },
      update: {
        originAliases: route.originAliases,
        destinationAliases: route.destinationAliases,
        sedanFare: route.sedanFare,
        suvMarkup: route.suvMarkup,
        estimatedKm: route.estimatedKm,
        suggestedFare: calculateSuggestedFare(route.estimatedKm),
        isActive: route.isActive,
        isBidirectional: route.isBidirectional,
        notes: route.notes,
      },
      create: {
        originCity: route.originCity,
        destinationCity: route.destinationCity,
        originAliases: route.originAliases,
        destinationAliases: route.destinationAliases,
        sedanFare: route.sedanFare,
        suvMarkup: route.suvMarkup,
        estimatedKm: route.estimatedKm,
        suggestedFare: calculateSuggestedFare(route.estimatedKm),
        isActive: route.isActive,
        isBidirectional: route.isBidirectional,
        notes: route.notes,
      },
    });
  }

  console.log(`Seeded ${JALANDHAR_OUTSTATION_SEED_ROUTES.length} outstation routes`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
