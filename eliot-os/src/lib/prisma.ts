import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./db-url";

// Some hosts (for example a Neon integration on Vercel) inject the connection
// string under a prefixed name like Eliot_DATABASE_URL rather than the plain
// DATABASE_URL the Prisma schema reads. Resolve it here before the client is
// constructed so the running app finds the database regardless of the prefix.
if (!process.env.DATABASE_URL) {
  const resolved = resolveDatabaseUrl(process.env);
  if (resolved) process.env.DATABASE_URL = resolved;
}

// Single Prisma client instance across hot reloads in dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
