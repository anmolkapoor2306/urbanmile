import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type DemoOperationalZone = Prisma.OperationalZoneCreateInput & {
  city: string;
};

const demoZones: DemoOperationalZone[] = [
  {
    city: 'Jalandhar',
    status: 'ENABLED',
    serviceRadiusKm: 40,
    airportEnabled: true,
    outstationEnabled: true,
    autoDispatchEnabled: true,
    enabledVehicleTypes: ['SEDAN', 'SUV', 'PREMIUM'],
  },
  {
    city: 'Amritsar',
    status: 'ENABLED',
    serviceRadiusKm: 55,
    airportEnabled: true,
    outstationEnabled: true,
    autoDispatchEnabled: true,
    enabledVehicleTypes: ['SEDAN', 'SUV'],
  },
  {
    city: 'Ludhiana',
    status: 'LIMITED',
    serviceRadiusKm: 45,
    airportEnabled: false,
    outstationEnabled: true,
    autoDispatchEnabled: true,
    enabledVehicleTypes: ['SEDAN', 'SUV'],
  },
  {
    city: 'Chandigarh',
    status: 'ENABLED',
    serviceRadiusKm: 60,
    airportEnabled: true,
    outstationEnabled: true,
    autoDispatchEnabled: true,
    enabledVehicleTypes: ['SEDAN', 'SUV', 'PREMIUM'],
  },
  {
    city: 'Delhi',
    status: 'LIMITED',
    serviceRadiusKm: 80,
    airportEnabled: true,
    outstationEnabled: true,
    autoDispatchEnabled: false,
    enabledVehicleTypes: ['SEDAN', 'PREMIUM'],
  },
  {
    city: 'Pathankot',
    status: 'DISABLED',
    serviceRadiusKm: 30,
    airportEnabled: false,
    outstationEnabled: false,
    autoDispatchEnabled: false,
    enabledVehicleTypes: ['SEDAN'],
  },
];

async function main() {
  for (const zone of demoZones) {
    const existingZone = await prisma.operationalZone.findFirst({
      where: { city: zone.city },
      select: { id: true },
    });

    if (existingZone) {
      await prisma.operationalZone.update({
        where: { id: existingZone.id },
        data: zone,
      });
    } else {
      await prisma.operationalZone.create({ data: zone });
    }
  }

  console.log(`Seeded ${demoZones.length} operational zones`);
}

main()
  .catch((error) => {
    console.error('Operational zone seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
