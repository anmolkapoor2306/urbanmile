import prisma from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';
  const username = process.env.ADMIN_USERNAME;

  if (!email || !password) {
    console.log('Skipping seed: ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.');
    return;
  }

  const existing = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    console.log(`Admin user already exists: ${existing.email} (${existing.role})`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const safeUsername = username
    ? username.toLowerCase().trim()
    : email.toLowerCase().trim();

  const user = await prisma.adminUser.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      username: safeUsername,
      passwordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log(`Created first admin: ${user.email} (@${user.username}, role: ${user.role})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });