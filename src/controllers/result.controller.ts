import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  saveAnalyticsRecord,
  withoutIpHash,
} from "../services/analytics-db.js";

const resultSchema = z.object({
  latency: z.number().finite().nonnegative(),
  downloadMbps: z.number().finite().nonnegative(),
  uploadMbps: z.number().finite().nonnegative(),
  jitter: z.number().finite().nonnegative().optional(),
  packetLoss: z.number().finite().nonnegative().optional().nullable(),
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
  timestamp: z.union([z.string(), z.date()]).optional().nullable(),
  server: z
    .object({
      name: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export async function resultController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const payload = resultSchema.parse(request.body);
    const record = await saveAnalyticsRecord({
      download: payload.downloadMbps,
      upload: payload.uploadMbps,
      ping: payload.latency,
      jitter: payload.jitter ?? 0,
      packetLoss: payload.packetLoss ?? 0,
      isp: payload.isp ?? null,
      asn: payload.asn ?? null,
      country: payload.country ?? null,
      province: payload.province ?? null,
      district: payload.district ?? null,
      city: payload.city ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      browser: payload.browser ?? null,
      operatingSystem: payload.operatingSystem ?? null,
      deviceType: payload.deviceType ?? null,
      networkType: payload.networkType ?? null,
      server:
        payload.server?.name?.trim() ||
        process.env.SPEEDTEST_SERVER_NAME ||
        "DCintelix Kigali",
      ipAddress: request.ip ?? null,
      timestamp: payload.timestamp ?? new Date(),
    });
    response.status(201).json({ success: true, record: withoutIpHash(record) });
  } catch (error) {
    next(error);
  }
}
