import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const poolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10);
const poolIdleTimeoutMs = Number.parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? "30000", 10);
const poolConnectionTimeoutMs = Number.parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? "5000", 10);
const runtimeUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

function createPrisma() {
  if (runtimeUrl?.startsWith("prisma://")) {
    return new PrismaClient({ accelerateUrl: runtimeUrl }).$extends(withAccelerate());
  }

  return new PrismaClient({
    adapter: runtimeUrl
      ? new PrismaPg({
          connectionString: runtimeUrl,
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
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (createPrisma() as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
