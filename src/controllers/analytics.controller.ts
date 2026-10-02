import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getAnalyticsOverview,
  getBrowserStats,
  getComparison,
  getDailyTrend,
  getDeviceStats,
  getDistribution,
  getHistoryTrend,
  getHourlyLoad,
  getIspRankings,
  getMonthlyGrowth,
  getOperatingSystemStats,
  getRecentSpeedTests,
  getRegionalStats,
  getRwandaAnalyticsOverview,
  getRwandaCityStats,
  getRwandaIspByCityComparison,
  getRwandaIspRankings,
  saveAnalyticsRecord,
  withoutIpHash,
} from "../services/analytics-db.js";

const payloadSchema = z.object({
  download: z.number().finite(),
  upload: z.number().finite(),
  ping: z.number().finite(),
  jitter: z.number().finite().optional(),
  packetLoss: z.number().finite().optional().nullable(),
  isp: z.string().optional().nullable(),
  asn: z.number().int().optional().nullable(),
  country: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
  browser: z.string().optional().nullable(),
  operatingSystem: z.string().optional().nullable(),
  deviceType: z.string().optional().nullable(),
  networkType: z.string().optional().nullable(),
  server: z.string().optional().nullable(),
  timestamp: z.union([z.string(), z.date()]).optional().nullable(),
});

const getString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export async function handleAnalyticsRequest(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const range = getString(request.query.range, "30d");
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 10));
    let result: unknown;

    if (request.method === "POST" && request.path === "/submit") {
      const payload = payloadSchema.parse(request.body);
      const record = await saveAnalyticsRecord({
        ...payload,
        jitter: payload.jitter ?? 0,
        packetLoss: payload.packetLoss ?? 0,
        ipAddress: request.ip ?? null,
        timestamp: payload.timestamp ?? new Date(),
      });
      response.status(201).json({ ok: true, record: withoutIpHash(record) });
      return;
    }

    if (request.method !== "GET") {
      response
        .set("Allow", "GET, POST")
        .status(405)
        .json({ ok: false, message: "Method not allowed" });
      return;
    }

    switch (request.path) {
      case "/daily":
        result = await getDailyTrend(
          Math.min(365, Math.max(1, Number(request.query.days) || 7)),
        );
        break;
      case "/distribution":
        result = await getDistribution(range);
        break;
      case "/isp-comparison":
        result = await getComparison(range);
        break;
      case "/hourly":
        result = await getHourlyLoad();
        break;
      case "/monthly":
        result = await getMonthlyGrowth();
        break;
      case "/overview":
        result = await getAnalyticsOverview(range);
        break;
      case "/isp-rankings":
        result = await getIspRankings(range);
        break;
      case "/regional":
        result = await getRegionalStats(range);
        break;
      case "/devices":
        result = await getDeviceStats(range);
        break;
      case "/browsers":
        result = await getBrowserStats(range);
        break;
      case "/operating-systems":
        result = await getOperatingSystemStats(range);
        break;
      case "/recent":
        result = await getRecentSpeedTests(limit);
        break;
      case "/history":
        result = await getHistoryTrend(range);
        break;
      case "/rwanda":
        result = await getRwandaAnalyticsOverview(range);
        break;
      case "/rwanda/isp-rankings":
        result = await getRwandaIspRankings(range);
        break;
      case "/rwanda/cities":
        result = await getRwandaCityStats(range);
        break;
      case "/rwanda/isp-city-comparison":
        result = await getRwandaIspByCityComparison(range);
        break;
      default:
        response
          .status(404)
          .json({ ok: false, message: "Analytics endpoint not found" });
        return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
}
