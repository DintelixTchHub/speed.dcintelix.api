import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const poolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10);
const poolIdleTimeoutMs = Number.parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? "30000", 10);
const poolConnectionTimeoutMs = Number.parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? "5000", 10);

if (!process.env.DATABASE_URL && connectionString) {
  process.env.DATABASE_URL = connectionString;
}

if (!process.env.DIRECT_URL && connectionString) {
  process.env.DIRECT_URL = connectionString;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: connectionString
      ? new PrismaPg({
          connectionString,
          max: Number.isInteger(poolMax) && poolMax > 0 ? poolMax : 10,
          idleTimeoutMillis: Number.isInteger(poolIdleTimeoutMs) && poolIdleTimeoutMs > 0
            ? poolIdleTimeoutMs
            : 30_000,
          connectionTimeoutMillis: Number.isInteger(poolConnectionTimeoutMs) && poolConnectionTimeoutMs > 0
            ? poolConnectionTimeoutMs
            : 5_000,
        })
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
