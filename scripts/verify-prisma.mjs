import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({
	adapter: connectionString ? new PrismaPg({ connectionString }) : undefined,
});

try {
	await prisma.$connect();
	const count = await prisma.speedTest.count();
	console.log(`connected; speedTest count=${count}`);
} finally {
	await prisma.$disconnect();
}