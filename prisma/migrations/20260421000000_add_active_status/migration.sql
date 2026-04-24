import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Migration is handled through raw SQL, no data changes needed
  console.log('Migration to add ACTIVE status to BookingStatus enum')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })