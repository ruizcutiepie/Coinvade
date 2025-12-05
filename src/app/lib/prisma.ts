// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// During development, Next.js hot reloading can create many instances.
// We store the instance in globalThis to reuse it.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Create a single instance of PrismaClient or reuse the existing one.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // You can add 'query' for debugging
  });

// Prevent multiple Prisma instances in dev due to HMR.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
