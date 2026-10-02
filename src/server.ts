import "dotenv/config";
import cors from "cors";
import express from "express";
import speedTestRoutes from "./routes/index.js";
import analyticsRoutes from "./routes/analytics.route.js";
import ispRoutes from "./routes/isp.route.js";
import { pingProbeController } from "./controllers/ping.controller.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ResponseHandler } from "./middlewares/ResponseHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { logger } from "./utils/looger.js";
import { prisma } from "./lib/prisma.js";
import { hasDatabase } from "./services/analytics-db.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins =
  process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? "*";

app.disable("x-powered-by");
app.use(requestLogger);
const trustProxySetting = process.env.TRUST_PROXY?.trim();
if (trustProxySetting && trustProxySetting.toLowerCase() !== "false") {
  const trustProxyValue =
    trustProxySetting.toLowerCase() === "true"
      ? true
      : /^\d+$/.test(trustProxySetting)
        ? Number(trustProxySetting)
        : trustProxySetting;
  app.set(
    "trust proxy",
    trustProxyValue,
  );
}
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Cache-Control", "Pragma"],
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_request, response) => {
  response.set("Cache-Control", "no-store").json({ success: true });
});

app.use("/", (_request, response) => {
  response.status(200).set("Cache-Control", "no-store").json({ success: true, message: "Speed-test API is running" });
});
app.use("/api/speedtest", speedTestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/isps", ispRoutes);

app.route("/api/ping").get(pingProbeController).head(pingProbeController);

app.use(ResponseHandler.notFound);
app.use(errorHandler);

async function startServer() {
  if (hasDatabase()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info("Database connected", { provider: "postgresql" });
    } catch (error) {
      logger.error("Database connection failed", { error });
      await prisma.$disconnect();
      process.exitCode = 1;
      return;
    }
  } else {
    logger.warn("Database is not configured; analytics will use in-memory fallback");
  }

  app.listen(port, "0.0.0.0", () => {
    logger.info("Speed-test API listening", { port });
  });
}

void startServer();
