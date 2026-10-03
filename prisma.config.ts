import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("Set DIRECT_URL to a PostgreSQL connection string for Prisma migrations.");
}

if (databaseUrl.startsWith("prisma://")) {
	throw new Error("Prisma Migrate requires DIRECT_URL to be a direct PostgreSQL connection string, not an Accelerate URL.");
}

export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: { url: databaseUrl },
});