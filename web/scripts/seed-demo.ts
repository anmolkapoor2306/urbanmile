import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client';

const prisma = new PrismaClient();

const cities = [
  { name: 'Jalandhar', state: 'Punjab' },
  { name: 'Amritsar', state: 'Punjab' },
  { name: 'Ludhiana', state: 'Punjab' },
  { name: 'Chandigarh', state: 'Chandigarh' },
  { name: 'Delhi', state: 'Delhi' },
  { name: 'Pathankot', state: 'Punjab' },
  { name: 'Zirakpur', state: 'Punjab' },
  { name: 'Nawanshahr', state: 'Punjab' },
  { name: 'Panchkula', state: 'Haryana' },
];

const pickupStreets = [
  'Punjab Bhawan', 'Ragama Mall', 'Model Town', 'Green Park', 'Carterpur',
  'Sector 26', 'Guru Nanak Dev Stadium', 'Ferozepur Road', 'Malerkotla Road',
  'Phool Bagh', 'Race Course', 'Fatehgarh Road', 'Mansa Road', 'Shastri Nagar',
  'Civil Lines', 'Gobindpura', 'Akal Takht Road', 'Sukhna Lake Road',
];

const dropoffStreets = [
  'Golden Temple Area', 'Ranjit Avenue', 'Sector 17', 'Lehragaga Road', 'GT Road',
  'Sector 7', 'Airport Road', 'Naya Bazar', 'Civil Lines Bus Stand',
  'Sector 43 Market', 'Sector 22', 'Kalkaji', 'Connaught Place', 'RK Ashram',
  'Sector 34', 'Sector 10', 'ISBT', 'Mall Road', 'Sector 35 Mall',
];

const driverNames = [
  'Harpreet Singh', 'Manpreet Kaur', 'Gurpreet Singh', 'Simranjit Kaur', 'Amarjeet Singh',
  'Jaspreet Singh', 'Navjot Kaur', 'Balwinder Singh', 'Rajinder Kaur', 'Harman Singh',
  'Manjit Kaur', 'Gurnail Singh', 'Simranjit Singh', 'Amandeep Kaur', 'Baljit Singh',
  'Rajvir Singh', 'Harwinder Kaur', 'Jaskaran Singh', 'Maninder Kaur', 'Gurwinder Singh',
  'Navdeep Singh', 'Amanpreet Kaur', 'Balbir Singh', 'Ranjeet Kaur', 'Harneet Singh',
  'Manjit Singh', 'Gurpreet Kaur', 'Simranjit Singh', 'Amarjeet Kaur', 'Balwinder Kaur',
  'Rajinder Singh', 'Harmanpreet Singh', 'Manjit Kaur', 'Gurnail Kaur', 'Simranjit Kaur',
  'Amandeep Singh', 'Baljit Kaur', 'Rajvir Kaur', 'Harwinder Singh', 'Jaskaran Kaur',
];

const vehicleBrands = ['Hyundai Verna', 'Maruti Swift Dzire', 'Toyota Innova', 'Honda City', 'Skoda Laura', 'Santro', 'Etios', 'Altroz', 'Ciaz', 'Baleno'];
const carTypes = ['SEDAN', 'SUV', 'VAN'] as const;

const statuses = ['CONFIRMED', 'ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
const paymentStatuses = ['UNPAID', 'PAID', 'PENDING'] as const;
const bookingTypes = ['PERSONAL', 'BUSINESS'] as const;

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rand(arr: string[]) { return arr[randInt(0, arr.length - 1)]; }
function randFloat(min: number, max: number) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }
function randPhone(): string {
  const prefixes = ['98765', '94182', '98152', '98532', '98734', '94176', '98042', '98723', '94191', '98156', '98530', '98760'];
  return prefixes[randInt(0, prefixes.length - 1)] + String(randInt(1000, 9999));
}

async function main() {
  console.log('Checking existing data...');
  const existingCount = await prisma.booking.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} bookings. Skipping seed.`);
    await prisma.$disconnect();
    return;
  }

  console.log('Creating demo data...');

  // Create vendors
  const vendors = await Promise.all(
    [
      { name: 'Shri Ram Travel Services', phone: '9876543210', contactPerson: 'Ramkishan Jain' },
      { name: 'Satnaam Cabs', phone: '9876543211', contactPerson: 'Gurmeet Singh' },
      { name: 'Punjab Cab Services', phone: '9876543212', contactPerson: 'Baldev Singh' },
      { name: 'Speedo Travel', phone: '9876543213', contactPerson: 'Amit Sharma' },
    ].map(v => prisma.vendor.create({ data: v }))
  );

  console.log(`Created ${vendors.length} vendors`);

  // Create own drivers
  const ownDrivers = await Promise.all(
    driverNames.slice(0, 20).map((name, i) =>
      prisma.driver.create({
        data: {
          name,
          phone: randPhone(),
          vehicleNumber: `PB${randInt(0, 2)}AB${randInt(10, 99)}${randInt(1000, 9999)}`,
          vehicleType: rand(carTypes),
          driverType: 'OWN',
          availabilityStatus: i % 3 === 0 ? 'BUSY' : 'AVAILABLE',
          isActive: true,
          driverCode: `DRV-${String(i + 1).padStart(4, '0')}`,
        },
      })
    )
  );

  // Create vendor drivers
  const vendorDrivers = await Promise.all(
    driverNames.slice(20).map((name, i) =>
      prisma.driver.create({
        data: {
          name,
          phone: randPhone(),
          vehicleNumber: `${['PB', 'HR', 'DL'][randInt(0, 2)]}${randInt(0, 9)}${rand(['XY','AB','CD'])}${randInt(10,99)}${randInt(1000,9999)}`,
          vehicleType: rand(carTypes),
          driverType: 'VENDOR',
          availabilityStatus: i % 3 === 0 ? 'BUSY' : 'AVAILABLE',
          isActive: true,
          vendorId: vendors[i % vendors.length].id,
          driverCode: `VDRV-${String(i + 1).padStart(4, '0')}`,
          companyName: vendors[i % vendors.length].name,
        },
      })
    )
  );

  const allDrivers = [...ownDrivers, ...vendorDrivers];
  console.log(`Created ${allDrivers.length} drivers`);

  // Create vehicles
  const vehicles = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      prisma.vehicle.create({
        data: {
          plateNumber: `PB${randInt(0, 2)}AB${randInt(10, 99)}${randInt(1000, 9999)}`,
          model: rand(vehicleBrands),
          vehicleType: rand(carTypes),
          ownershipType: 'OWN',
          driverId: i < ownDrivers.length ? ownDrivers[i].id : null,
          status: 'ACTIVE',
        },
      })
    )
  );

  console.log(`Created ${vehicles.length} vehicles`);

  // Create bookings
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const bookingCount = 50;

  const statusDistribution: Record<string, number> = {
    CONFIRMED: 12,
    ASSIGNED: 10,
    ACTIVE: 8,
    COMPLETED: 15,
    CANCELLED: 5,
  };

  const statusList: string[] = [];
  for (const [status, count] of Object.entries(statusDistribution)) {
    statusList.push(...Array(count).fill(status));
  }

  // Shuffle status list
  for (let i = statusList.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [statusList[i], statusList[j]] = [statusList[j], statusList[i]];
  }

  console.log('Creating bookings...');
  let created = 0;

  for (let i = 0; i < bookingCount; i++) {
    const status = statusList[i] as any;
    const pickupCity = cities[randInt(0, cities.length - 1)];
    let dropoffCity = cities[randInt(0, cities.length - 1)];
    while (dropoffCity.name === pickupCity.name) {
      dropoffCity = cities[randInt(0, cities.length - 1)];
    }

    // Determine pickup time based on status
    let pickupDateTime: Date;
    if (status === 'ACTIVE') {
      // Active trips: started 30min-4hrs ago
      pickupDateTime = new Date(now.getTime() - randInt(30, 240) * 60000);
    } else if (status === 'ASSIGNED') {
      // Assigned: 2h-24h from now
      pickupDateTime = new Date(now.getTime() + randInt(2, 24) * 3600000);
    } else if (status === 'CONFIRMED') {
      // Confirmed: 1d-14d from now
      pickupDateTime = new Date(now.getTime() + randInt(1, 14) * 86400000 + randInt(6, 20) * 3600000);
    } else if (status === 'COMPLETED') {
      // Completed: spread across last 7 days, some today
      if (i % 3 === 0) {
        // Today
        pickupDateTime = new Date(todayStart.getTime() + randInt(6, 18) * 3600000);
      } else {
        pickupDateTime = new Date(todayStart.getTime() - randInt(1, 6) * 86400000 + randInt(6, 20) * 3600000);
      }
    } else {
      // Cancelled: last 7 days
      pickupDateTime = new Date(todayStart.getTime() - randInt(0, 6) * 86400000 + randInt(6, 20) * 3600000);
    }

    // Add random minutes to pickup time
    pickupDateTime = new Date(pickupDateTime.getTime() + randInt(0, 59) * 60000);

    const fare = randInt(1200, 12000);
    const carType = rand(carTypes);
    const bookingType = rand(bookingTypes);

    // Determine driver assignment
    const assignedDriver = (status === 'ASSIGNED' || status === 'ACTIVE') ? allDrivers[randInt(0, allDrivers.length - 1)] : null;
    const vehicle = assignedDriver ? vehicles[randInt(0, vehicles.length - 1)] : null;

    // Payment status: completed trips likely paid
    let paymentStatus: any;
    if (status === 'COMPLETED') {
      paymentStatus = randInt(0, 2) === 0 ? 'PAID' : 'UNPAID';
    } else if (status === 'CANCELLED') {
      paymentStatus = 'REFUNDED';
    } else {
      paymentStatus = 'UNPAID';
    }

    const fullName = rand(driverNames);
    const phone = randPhone();

    const bookingData: any = {
      publicBookingId: `UM-2026-${String(i + 1).padStart(4, '0')}`,
      bookingType,
      fullName,
      email: `${fullName.toLowerCase().replace(/\s/g, '.')}@email.com`,
      phone: `91${phone}`,
      pickupLocation: `${rand(pickupStreets)} ${pickupCity.name}`,
      pickupLatitude: randFloat(29.5, 31.0),
      pickupLongitude: randFloat(74.0, 78.0),
      pickupLocationSource: 'AUTOCOMPLETE',
      dropoffLocation: `${rand(dropoffStreets)} ${dropoffCity.name}`,
      dropoffLatitude: randFloat(29.5, 31.0),
      dropoffLongitude: randFloat(74.0, 78.0),
      dropoffLocationSource: 'AUTOCOMPLETE',
      pickupDateTime,
      carType,
      specialInstructions: randInt(0, 1) ? null : rand(['Please wait at hotel lobby', 'Call 10 min before pickup', 'AC required', 'Airport pickup with signage', null]),
      internalNotes: null,
      status,
      paymentStatus,
      assignmentType: assignedDriver?.driverType === 'VENDOR' ? 'OUTSOURCED_DRIVER' : assignedDriver ? 'OWN_DRIVER' : null,
      createdAt: status === 'COMPLETED' || status === 'CANCELLED'
        ? new Date(pickupDateTime.getTime() - randInt(1, 48) * 3600000)
        : new Date(now.getTime() - randInt(0, 72) * 3600000),
      bookingReference: `UM-${pickupDateTime.getFullYear()}0${randInt(1, 9)}${randInt(1, 9)}-${crypto.randomUUID().slice(0, 8)}`,
      fareAmount: fare,
      commissionAmount: status === 'COMPLETED' ? Math.round(fare * randFloat(0.08, 0.15)) : null,
      driverEarning: assignedDriver ? Math.round(fare * randFloat(0.4, 0.7)) : null,
      payoutAmount: assignedDriver ? Math.round(fare * randFloat(0.3, 0.6)) : null,
      netEarningAmount: fare - (assignedDriver ? Math.round(fare * randFloat(0.3, 0.6)) : 0),
      driverId: assignedDriver?.id || null,
      vehicleId: vehicle?.id || null,
      assignedAt: assignedDriver ? new Date(pickupDateTime.getTime() - randInt(10, 120) * 60000) : null,
      confirmedAt: status !== 'NEW' ? new Date(pickupDateTime.getTime() - randInt(10, 60) * 60000) : null,
      startedAt: status === 'ACTIVE' ? new Date(pickupDateTime.getTime() + randInt(0, 15) * 60000) : null,
      completedAt: status === 'COMPLETED' ? new Date(pickupDateTime.getTime() + randInt(30, 480) * 60000) : null,
      cancelledAt: status === 'CANCELLED' ? new Date(pickupDateTime.getTime() + randInt(5, 120) * 60000) : null,
      cancelReason: status === 'CANCELLED' ? rand(['Customer cancelled', 'Driver unavailable', 'Weather conditions', 'Payment issue', null]) : null,
    };

    await prisma.booking.create({ data: bookingData });
    created++;

    if (created % 10 === 0) {
      console.log(`  Created ${created}/${bookingCount} bookings...`);
    }
  }

  console.log(`Created ${created} bookings`);

  // Print summary
  const counts = await prisma.booking.groupBy({ by: ['status'], _count: { status: true } });
  console.log('\nBooking summary by status:');
  counts.sort((a, b) => a.status.localeCompare(b.status)).forEach(c => {
    console.log(`  ${c.status}: ${c._count.status}`);
  });

  const totalRevenue = await prisma.booking.aggregate({
    _sum: { fareAmount: true },
    where: { status: 'COMPLETED' },
  });
  console.log(`\nTotal completed revenue: ₹${totalRevenue._sum.fareAmount?.toNumber() || 0}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
