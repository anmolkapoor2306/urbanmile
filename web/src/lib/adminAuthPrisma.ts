import { AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function findAdminUserByEmailOrUsername(emailOrUsername: string) {
  return prisma.adminUser.findFirst({
    where: {
      OR: [
        { email: emailOrUsername.toLowerCase().trim() },
        { username: emailOrUsername.toLowerCase().trim() },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      passwordHash: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  });
}

export async function verifyAdminCredentials(
  emailOrUsername: string,
  password: string,
): Promise<{ user: Awaited<ReturnType<typeof findAdminUserByEmailOrUsername>>; ok: boolean } | null> {
  const user = await findAdminUserByEmailOrUsername(emailOrUsername);
  if (!user || !user.isActive) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  if (user.lastLoginAt === null || user.lastLoginAt < new Date(Date.now() - 24 * 3600 * 1000)) {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});
  }

  return { user, ok: true };
}

export async function createAdminSession(
  userId: string,
  role: AdminRole,
  ipAddress?: string,
  userAgent?: string,
) {
  const session = await prisma.adminSession.create({
    data: {
      userId,
      role,
      token: crypto.randomUUID(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000),
    },
  });
  return session;
}

export async function deleteAdminSessionByToken(token: string) {
  await prisma.adminSession.deleteMany({
    where: { token },
  });
}

export async function validateSessionTokenInDB(token: string) {
  return prisma.adminSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      },
    },
  });
}

export async function deleteExpiredSessions() {
  await prisma.adminSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}
