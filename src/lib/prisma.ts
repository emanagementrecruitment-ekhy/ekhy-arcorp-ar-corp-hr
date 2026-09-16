import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isNewClient = !globalForPrisma.prisma;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite's default journal mode locks the whole database file for the
// duration of every write, so once more than a handful of employees hit
// write endpoints at the same moment (check-in, kasbon, payslip) some of
// them start seeing raw "database is locked" errors. WAL lets reads run
// concurrently with a write, and busy_timeout makes a second writer queue
// and retry instead of failing immediately.
if (isNewClient) {
  prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
  prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;").catch(() => {});
}
