import { Prisma } from "@prisma/client";
import {
  hashIpAddress,
  normalizeBrowser,
  normalizeDeviceType,
  normalizeNetworkType,
  normalizeOS,
  sanitizeLocation,
  safeNumber,
  normalizeRwandaCity,
  normalizeRwandaProvince,
  validateRwandaCoordinates,
} from "../lib/analytics.js";
import { prisma } from "../lib/prisma.js";

export interface AnalyticsSubmissionPayload {
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  packetLoss?: number;
  isp?: string | null;
  asn?: number | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  browser?: string | null;
  operatingSystem?: string | null;
  deviceType?: string | null;
  networkType?: string | null;
  server?: string | null;
  ipAddress?: string | null;
  timestamp?: string | Date | null;
}

export type AnalyticsRecord = {
  id?: string;
  timestamp?: Date | string;
  download?: number;
  upload?: number;
  ping?: number;
  jitter?: number;
  packetLoss?: number;
  isp?: string | null;
  country?: string | null;
  city?: string | null;
  province?: string | null;
  district?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  networkType?: string | null;
  server?: string | null;
  asn?: number | null;
  ipHash?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function withoutIpHash(record: AnalyticsRecord): Omit<AnalyticsRecord, "ipHash"> {
  const publicRecord = { ...record };
  delete publicRecord.ipHash;
  return publicRecord;
}

const fallbackStore: AnalyticsRecord[] = [];
const MAX_FALLBACK_RECORDS = 5_000;
const SNAPSHOT_CACHE_TTL_MS = 10_000;
const snapshotCache = new Map<string, {
  expiresAt: number;
  promise: Promise<AnalyticsRecord[]>;
}>();
const supportedRanges = new Set(["all", "today", "yesterday", "7d", "30d", "90d"]);

function normalizeRange(range?: string): string {
  const normalizedRange = (range || "30d").toLowerCase();
  return supportedRanges.has(normalizedRange) ? normalizedRange : "30d";
}

function invalidateSnapshotCache() {
  snapshotCache.clear();
}

function addFallbackRecord(record: AnalyticsRecord) {
  fallbackStore.unshift(record);
  if (fallbackStore.length > MAX_FALLBACK_RECORDS) {
    fallbackStore.length = MAX_FALLBACK_RECORDS;
  }
  invalidateSnapshotCache();
}

export function hasDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  return Boolean(databaseUrl && databaseUrl.trim().length > 0);
}

function parseDate(value: Date | string | number | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inRange(recordDate: Date | null, range?: string): boolean {
  if (!recordDate) return true;
  const now = new Date();
  const normalizedRange = normalizeRange(range);

  if (normalizedRange === "all") return true;

  const msMap: Record<string, number> = {
    today: 24 * 60 * 60 * 1000,
    yesterday: 48 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
  };

  const window = msMap[normalizedRange] ?? msMap["30d"];
  return recordDate.getTime() >= now.getTime() - window;
}

function hasLocationData(record: AnalyticsRecord) {
  return Boolean(
    record.country ||
      record.province ||
      record.district ||
      record.city ||
      typeof record.latitude === "number" ||
      typeof record.longitude === "number"
  );
}

function getRangeStart(range?: string): Date | undefined {
  const normalizedRange = normalizeRange(range);
  if (normalizedRange === "all") return undefined;

  const msMap: Record<string, number> = {
    today: 24 * 60 * 60 * 1000,
    yesterday: 48 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
  };

  const windowMs = msMap[normalizedRange] ?? msMap["30d"];
  return new Date(Date.now() - windowMs);
}

export async function saveAnalyticsRecord(payload: AnalyticsSubmissionPayload) {
  const sanitized = sanitizeLocation({
    country: payload.country,
    province: payload.province,
    district: payload.district,
    city: payload.city,
    latitude: payload.latitude,
    longitude: payload.longitude,
  });

  // Apply Rwanda-specific normalization if applicable
  const isRwanda = sanitized.country?.toLowerCase() === "rwanda";
  const rwandaCity = isRwanda ? normalizeRwandaCity(sanitized.city) : sanitized.city;
  const rwandaProvince = isRwanda ? normalizeRwandaProvince(sanitized.province) : sanitized.province;

  const record: AnalyticsRecord = {
    download: safeNumber(payload.download),
    upload: safeNumber(payload.upload),
    ping: safeNumber(payload.ping),
    jitter: safeNumber(payload.jitter),
    packetLoss: safeNumber(payload.packetLoss, 0),
    isp: payload.isp?.trim() || null,
    asn: Number.isFinite(Number(payload.asn)) ? Number(payload.asn) : null,
    country: sanitized.country,
    province: rwandaProvince ?? sanitized.province,
    district: sanitized.district,
    city: rwandaCity,
    latitude: sanitized.latitude,
    longitude: sanitized.longitude,
    browser: normalizeBrowser(payload.browser),
    os: normalizeOS(payload.operatingSystem),
    deviceType: normalizeDeviceType(payload.deviceType),
    networkType: normalizeNetworkType(payload.networkType),
    server: payload.server?.trim() || null,
    ipHash: hashIpAddress(payload.ipAddress),
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
  };

  if (!hasDatabase()) {
    addFallbackRecord(record);
    return record;
  }

  const data = await prisma.speedTest.create({
    data: {
        download: record.download ?? 0,
        upload: record.upload ?? 0,
        ping: record.ping ?? 0,
        jitter: record.jitter ?? 0,
        packetLoss: record.packetLoss ?? 0,
        isp: record.isp ?? null,
        asn: record.asn ?? null,
        country: record.country ?? null,
        province: record.province ?? null,
        district: record.district ?? null,
        city: record.city ?? null,
        latitude: record.latitude ?? null,
        longitude: record.longitude ?? null,
        browser: record.browser ?? null,
        os: record.os ?? null,
        deviceType: record.deviceType ?? null,
        networkType: record.networkType ?? null,
        server: record.server ?? null,
        ipHash: record.ipHash ?? null,
        timestamp: parseDate(record.timestamp) ?? new Date(),
    },
  });

  invalidateSnapshotCache();
  return data as AnalyticsRecord;
}

export async function getAnalyticsSnapshot(range?: string): Promise<AnalyticsRecord[]> {
  const cacheKey = normalizeRange(range);
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const startDate = getRangeStart(cacheKey);
  const promise = (async () => {
    const records = hasDatabase()
      ? await prisma.speedTest.findMany({
          where: startDate ? { timestamp: { gte: startDate } } : undefined,
          orderBy: { timestamp: "desc" },
          select: {
            id: true,
            timestamp: true,
            download: true,
            upload: true,
            ping: true,
            jitter: true,
            packetLoss: true,
            isp: true,
            asn: true,
            country: true,
            province: true,
            district: true,
            city: true,
            latitude: true,
            longitude: true,
            browser: true,
            os: true,
            deviceType: true,
            networkType: true,
            server: true,
            ipHash: true,
          },
        })
      : fallbackStore;

    return records.filter((record) =>
      inRange(parseDate(record.timestamp), cacheKey)
    ) as AnalyticsRecord[];
  })();

  snapshotCache.set(cacheKey, {
    expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
    promise,
  });

  try {
    return await promise;
  } catch (error) {
    if (snapshotCache.get(cacheKey)?.promise === promise) snapshotCache.delete(cacheKey);
    throw error;
  }
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, current) => total + current, 0) / values.length;
}

export async function getAnalyticsOverview(range = "30d") {
  if (hasDatabase()) {
    const rangeStart = getRangeStart(range);
    const rangeFilter = rangeStart
      ? Prisma.sql`WHERE "timestamp" >= ${rangeStart}`
      : Prisma.empty;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [stats] = await prisma.$queryRaw<Array<{
      totalTests: bigint;
      averageDownload: number;
      averageUpload: number;
      averagePing: number;
      averageJitter: number;
      averagePacketLoss: number;
      testsToday: bigint;
      activeISPs: bigint;
      countries: bigint;
      cities: bigint;
    }>>(Prisma.sql`
      SELECT
        COUNT(*) AS "totalTests",
        COALESCE(AVG("download"), 0)::float8 AS "averageDownload",
        COALESCE(AVG("upload"), 0)::float8 AS "averageUpload",
        COALESCE(AVG("ping"), 0)::float8 AS "averagePing",
        COALESCE(AVG("jitter"), 0)::float8 AS "averageJitter",
        COALESCE(AVG("packetLoss"), 0)::float8 AS "averagePacketLoss",
        COUNT(*) FILTER (WHERE "timestamp" >= ${todayStart}) AS "testsToday",
        COUNT(DISTINCT NULLIF(BTRIM("isp"), '')) AS "activeISPs",
        COUNT(DISTINCT NULLIF(BTRIM("country"), '')) AS "countries",
        COUNT(DISTINCT NULLIF(BTRIM("city"), '')) AS "cities"
      FROM "SpeedTest"
      ${rangeFilter}
    `);

    return {
      totalTests: Number(stats?.totalTests ?? 0),
      averageDownload: Number(Number(stats?.averageDownload ?? 0).toFixed(2)),
      averageUpload: Number(Number(stats?.averageUpload ?? 0).toFixed(2)),
      averagePing: Number(Number(stats?.averagePing ?? 0).toFixed(2)),
      averageJitter: Number(Number(stats?.averageJitter ?? 0).toFixed(2)),
      averagePacketLoss: Number(Number(stats?.averagePacketLoss ?? 0).toFixed(2)),
      testsToday: Number(stats?.testsToday ?? 0),
      activeISPs: Number(stats?.activeISPs ?? 0),
      countries: Number(stats?.countries ?? 0),
      cities: Number(stats?.cities ?? 0),
    };
  }

  const records = await getAnalyticsSnapshot(range);
  const totalTests = records.length;

  return {
    totalTests,
    averageDownload: Number(average(records.map((record) => Number(record.download ?? 0))).toFixed(2)),
    averageUpload: Number(average(records.map((record) => Number(record.upload ?? 0))).toFixed(2)),
    averagePing: Number(average(records.map((record) => Number(record.ping ?? 0))).toFixed(2)),
    averageJitter: Number(average(records.map((record) => Number(record.jitter ?? 0))).toFixed(2)),
    averagePacketLoss: Number(average(records.map((record) => Number(record.packetLoss ?? 0))).toFixed(2)),
    testsToday: (await getAnalyticsSnapshot("today")).length,
    activeISPs: new Set(records.map((record) => record.isp).filter(Boolean)).size,
    countries: new Set(records.map((record) => record.country).filter(Boolean)).size,
    cities: new Set(records.map((record) => record.city).filter(Boolean)).size,
  };
}

export async function getDailyTrend(days = 7) {
  const records = await getAnalyticsSnapshot(`30d`);
  const map = new Map<string, number>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(start);
    day.setDate(day.getDate() - index);
    map.set(day.toISOString().slice(0, 10), 0);
  }

  records.forEach((record) => {
    const ts = parseDate(record.timestamp as Date | string | undefined);
    if (!ts) return;
    const key = ts.toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  });

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getHourlyTrend() {
  const records = await getAnalyticsSnapshot("30d");
  const map = new Map<string, number>();
  Array.from({ length: 24 }, (_, hour) => {
    map.set(`${String(hour).padStart(2, "0")}:00`, 0);
  });

  records.forEach((record) => {
    const ts = parseDate(record.timestamp as Date | string | undefined);
    if (!ts) return;
    const key = `${String(ts.getHours()).padStart(2, "0")}:00`;
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  });

  return Array.from(map.entries()).map(([hour, load]) => ({ hour, load }));
}

export interface ISPAnalytics {
  id: string;
  name: string;
  country: string | null;
  province: string | null;
  city: string | null;
  location: string | null;
  networkType: string | null;
  avgDownload: number;
  avgUpload: number;
  avgPing: number;
  users: number;
  rating: number;
}

export async function getISPList(range = "30d"): Promise<ISPAnalytics[]> {
  const records = await getAnalyticsSnapshot(range);

  type ISPGroup = {
    name: string;
    country: string | null;
    province: string | null;
    city: string | null;
    location: string | null;
    networkType: string | null;
    download: number[];
    upload: number[];
    ping: number[];
    count: number;
    provinceCounts: Record<string, number>;
    cityCounts: Record<string, number>;
    networkTypeCounts: Record<string, number>;
    locationCounts: Record<string, number>;
  };

  const grouped = new Map<string, ISPGroup>();

  records.forEach((record) => {
    const key = record.isp?.trim();
    if (!key) return;

    const locationLabel = [record.city, record.province, record.country].filter(Boolean).join(", ") || null;

    const current: ISPGroup = grouped.get(key) ?? {
      name: key,
      country: record.country ?? null,
      province: record.province ?? null,
      city: record.city ?? null,
      location: locationLabel,
      networkType: record.networkType ?? null,
      download: [],
      upload: [],
      ping: [],
      count: 0,
      provinceCounts: {},
      cityCounts: {},
      networkTypeCounts: {},
      locationCounts: {},
    };

    if (!current.country && record.country) {
      current.country = record.country;
    }

    if (record.province) {
      current.provinceCounts[record.province] = (current.provinceCounts[record.province] ?? 0) + 1;
      if (!current.province || current.provinceCounts[record.province] > current.provinceCounts[current.province]) {
        current.province = record.province;
      }
    }

    if (record.city) {
      current.cityCounts[record.city] = (current.cityCounts[record.city] ?? 0) + 1;
      if (!current.city || current.cityCounts[record.city] > current.cityCounts[current.city]) {
        current.city = record.city;
      }
    }

    if (record.networkType) {
      current.networkTypeCounts[record.networkType] = (current.networkTypeCounts[record.networkType] ?? 0) + 1;
      if (!current.networkType || current.networkTypeCounts[record.networkType] > current.networkTypeCounts[current.networkType]) {
        current.networkType = record.networkType;
      }
    }

    if (locationLabel) {
      current.locationCounts[locationLabel] = (current.locationCounts[locationLabel] ?? 0) + 1;
      if (!current.location || current.locationCounts[locationLabel] > current.locationCounts[current.location]) {
        current.location = locationLabel;
      }
    }

    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    current.ping.push(Number(record.ping ?? 0));
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => {
      const avgDownload = Number(average(entry.download).toFixed(2));
      const avgUpload = Number(average(entry.upload).toFixed(2));
      const avgPing = Number(average(entry.ping).toFixed(2));
      const rating = avgDownload > 0 ? Math.min(5, Math.max(1, Math.round(avgDownload / 40))) : 0;

      return {
        id: entry.name,
        name: entry.name,
        country: entry.country,
        province: entry.province,
        city: entry.city,
        location: entry.location,
        networkType: entry.networkType,
        avgDownload,
        avgUpload,
        avgPing,
        users: entry.count,
        rating,
      };
    })
    .sort((left, right) => right.avgDownload - left.avgDownload);
}

export async function getIspRankings(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  type ISPGroup = {
    name: string;
    download: number[];
    upload: number[];
    ping: number[];
    jitter: number[];
    packetLoss: number[];
    count: number;
  };

  const grouped = new Map<string, ISPGroup>();

  records.forEach((record) => {
      const key = record.isp?.trim();
      if (!key) return;
    const current: ISPGroup = grouped.get(key) ?? {
      name: key,
      download: [],
      upload: [],
      ping: [],
      jitter: [],
      packetLoss: [],
      count: 0,
    };
    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    current.ping.push(Number(record.ping ?? 0));
    current.jitter.push(Number(record.jitter ?? 0));
    current.packetLoss.push(Number(record.packetLoss ?? 0));
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      name: entry.name,
      averageDownload: Number(average(entry.download).toFixed(2)),
      averageUpload: Number(average(entry.upload).toFixed(2)),
      averagePing: Number(average(entry.ping).toFixed(2)),
      averageJitter: Number(average(entry.jitter).toFixed(2)),
      packetLoss: Number(average(entry.packetLoss).toFixed(2)),
      tests: entry.count,
    }))
    .sort((left, right) => right.averageDownload - left.averageDownload)
    .map((entry, index) => ({ ...entry, rank: index + 1, trend: 0 }));
}

export async function getRegionalStats(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  type RegionGroup = {
    country: string;
    province: string | null;
    district: string | null;
    city: string | null;
    download: number[];
    upload: number[];
    ping: number[];
    count: number;
  };

  const grouped = new Map<string, RegionGroup>();

  records.forEach((record) => {
    const key = `${record.country ?? "Unknown"}|${record.province ?? "Unknown"}|${record.district ?? "Unknown"}|${record.city ?? "Unknown"}`;
    const current: RegionGroup = grouped.get(key) ?? {
      country: record.country ?? "Unknown",
      province: record.province ?? null,
      district: record.district ?? null,
      city: record.city ?? null,
      download: [],
      upload: [],
      ping: [],
      count: 0,
    };
    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    current.ping.push(Number(record.ping ?? 0));
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((entry) => ({
    country: entry.country,
    province: entry.province,
    district: entry.district,
    city: entry.city,
    averageDownload: Number(average(entry.download).toFixed(2)),
    averageUpload: Number(average(entry.upload).toFixed(2)),
    averagePing: Number(average(entry.ping).toFixed(2)),
    testCount: entry.count,
  }));
}

export async function getDistribution(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const buckets = [
    { range: "0-50", count: 0 },
    { range: "50-100", count: 0 },
    { range: "100-200", count: 0 },
    { range: "200+", count: 0 },
  ];

  records.forEach((record) => {
    const value = Number(record.download ?? 0);
    if (value < 50) buckets[0].count += 1;
    else if (value < 100) buckets[1].count += 1;
    else if (value < 200) buckets[2].count += 1;
    else buckets[3].count += 1;
  });

  return buckets;
}

export async function getComparison(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  type ComparisonGroup = {
    name: string;
    download: number[];
    upload: number[];
  };

  const grouped = new Map<string, ComparisonGroup>();

  records.forEach((record) => {
    const key = record.isp ?? "Unknown";
    const current: ComparisonGroup = grouped.get(key) ?? { name: key, download: [], upload: [] };
    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      name: entry.name,
      download: Number(average(entry.download).toFixed(2)),
      upload: Number(average(entry.upload).toFixed(2)),
    }))
    .sort((left, right) => right.download - left.download)
    .slice(0, 8);
}

export async function getHourlyLoad() {
  return getHourlyTrend();
}

export async function getMonthlyGrowth() {
  if (hasDatabase()) {
    const rows = await prisma.$queryRaw<Array<{ month: string; tests: bigint; users: bigint }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "timestamp"), 'YYYY-MM') AS "month",
        COUNT(*) AS "tests",
        COUNT(*) FILTER (WHERE "ipHash" IS NOT NULL) AS "users"
      FROM "SpeedTest"
      WHERE "timestamp" >= ${getRangeStart("90d")}
      GROUP BY DATE_TRUNC('month', "timestamp")
      ORDER BY DATE_TRUNC('month', "timestamp")
    `;
    return rows.map((row) => ({
      month: row.month,
      tests: Number(row.tests),
      users: Number(row.users),
    }));
  }

  const records = await getAnalyticsSnapshot("90d");
  const map = new Map<string, { month: string; tests: number; users: number }>();

  records.forEach((record) => {
    const ts = parseDate(record.timestamp as Date | string | undefined);
    if (!ts) return;
    const key = ts.toISOString().slice(0, 7);
    const current = map.get(key) ?? { month: key, tests: 0, users: 0 };
    current.tests += 1;
    if (record.ipHash) current.users += 1;
    map.set(key, current);
  });

  return Array.from(map.values()).sort((left, right) => left.month.localeCompare(right.month));
}

export async function getRecentSpeedTests(limit = 10) {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit) || 10));
  const records = hasDatabase()
    ? await prisma.speedTest.findMany({
        where: { timestamp: { gte: getRangeStart("30d") } },
        orderBy: { timestamp: "desc" },
        take: boundedLimit,
        select: {
          timestamp: true,
          download: true,
          upload: true,
          ping: true,
          jitter: true,
          packetLoss: true,
          isp: true,
          city: true,
          country: true,
          networkType: true,
        },
      })
    : (await getAnalyticsSnapshot("30d")).slice(0, boundedLimit);

  return records.slice(0, limit).map((record) => ({
    download: Number(record.download ?? 0),
    upload: Number(record.upload ?? 0),
    ping: Number(record.ping ?? 0),
    jitter: Number(record.jitter ?? 0),
    packetLoss: Number(record.packetLoss ?? 0),
    isp: record.isp ?? "Unknown",
    city: record.city ?? "Unknown",
    country: record.country ?? "Unknown",
    networkType: record.networkType ?? "Unknown",
    timestamp: new Date(record.timestamp ?? Date.now()).toISOString(),
  }));
}

export async function getHistoryTrend(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const grouped = new Map<string, { date: string; downloads: number[]; uploads: number[]; ping: number[] }>();

  records.forEach((record) => {
    const ts = parseDate(record.timestamp as Date | string | undefined);
    if (!ts) return;
    const key = ts.toISOString().slice(0, 10);
    const current = grouped.get(key) ?? { date: key, downloads: [], uploads: [], ping: [] };
    current.downloads.push(Number(record.download ?? 0));
    current.uploads.push(Number(record.upload ?? 0));
    current.ping.push(Number(record.ping ?? 0));
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      date: entry.date,
      download: Number(average(entry.downloads).toFixed(2)),
      upload: Number(average(entry.uploads).toFixed(2)),
      ping: Number(average(entry.ping).toFixed(2)),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export async function getDeviceStats(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const grouped = new Map<string, number>();
  records.forEach((record) => {
    const key = record.deviceType ?? "Unknown";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
}

export async function getBrowserStats(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const grouped = new Map<string, number>();
  records.forEach((record) => {
    const key = record.browser ?? "Unknown";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
}

export async function getOperatingSystemStats(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const grouped = new Map<string, number>();
  records.forEach((record) => {
    const key = record.os ?? "Unknown";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
}

// ============== RWANDA-SPECIFIC ANALYTICS ==============

export async function getIspRankingsByCountry(country: string, range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const countryRecords = records.filter((record) => record.country?.toUpperCase() === country.toUpperCase());

  type ISPGroup = {
    name: string;
    download: number[];
    upload: number[];
    ping: number[];
    jitter: number[];
    packetLoss: number[];
    count: number;
  };

  const grouped = new Map<string, ISPGroup>();

  countryRecords.forEach((record) => {
    const key = record.isp?.trim();
    if (!key) return;
    const current: ISPGroup = grouped.get(key) ?? {
      name: key,
      download: [],
      upload: [],
      ping: [],
      jitter: [],
      packetLoss: [],
      count: 0,
    };
    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    current.ping.push(Number(record.ping ?? 0));
    current.jitter.push(Number(record.jitter ?? 0));
    current.packetLoss.push(Number(record.packetLoss ?? 0));
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      name: entry.name,
      rank: 0,
      averageDownload: Number(average(entry.download).toFixed(2)),
      averageUpload: Number(average(entry.upload).toFixed(2)),
      averagePing: Number(average(entry.ping).toFixed(2)),
      averageJitter: Number(average(entry.jitter).toFixed(2)),
      packetLoss: Number(average(entry.packetLoss).toFixed(2)),
      tests: entry.count,
      country: country,
    }))
    .sort((left, right) => right.averageDownload - left.averageDownload)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function getRwandaIspRankings(range = "30d") {
  return getIspRankingsByCountry("Rwanda", range);
}

export async function getRwandaAnalyticsOverview(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const rwandaRecords = records.filter((record) => record.country?.toUpperCase() === "RWANDA");
  const totalTests = rwandaRecords.length;

  return {
    country: "Rwanda",
    totalTests,
    averageDownload: Number(average(rwandaRecords.map((record) => Number(record.download ?? 0))).toFixed(2)),
    averageUpload: Number(average(rwandaRecords.map((record) => Number(record.upload ?? 0))).toFixed(2)),
    averagePing: Number(average(rwandaRecords.map((record) => Number(record.ping ?? 0))).toFixed(2)),
    averageJitter: Number(average(rwandaRecords.map((record) => Number(record.jitter ?? 0))).toFixed(2)),
    averagePacketLoss: Number(average(rwandaRecords.map((record) => Number(record.packetLoss ?? 0))).toFixed(2)),
    testsToday: (await getAnalyticsSnapshot("today")).filter((r) => r.country?.toUpperCase() === "RWANDA").length,
    activeISPs: new Set(rwandaRecords.map((record) => record.isp).filter(Boolean)).size,
    cities: new Set(rwandaRecords.map((record) => record.city).filter(Boolean)).size,
  };
}

export async function getRwandaCityStats(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const rwandaRecords = records.filter((record) => record.country?.toUpperCase() === "RWANDA");

  type CityGroup = {
    city: string;
    province: string | null;
    download: number[];
    upload: number[];
    ping: number[];
    count: number;
  };

  const grouped = new Map<string, CityGroup>();

  rwandaRecords.forEach((record) => {
    const key = record.city ?? "Unknown";
    const current: CityGroup = grouped.get(key) ?? {
      city: key,
      province: record.province ?? null,
      download: [],
      upload: [],
      ping: [],
      count: 0,
    };
    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    current.ping.push(Number(record.ping ?? 0));
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      city: entry.city,
      province: entry.province,
      averageDownload: Number(average(entry.download).toFixed(2)),
      averageUpload: Number(average(entry.upload).toFixed(2)),
      averagePing: Number(average(entry.ping).toFixed(2)),
      testCount: entry.count,
    }))
    .sort((left, right) => right.averageDownload - left.averageDownload);
}

export async function getRwandaIspByCityComparison(range = "30d") {
  const records = await getAnalyticsSnapshot(range);
  const rwandaRecords = records.filter((record) => record.country?.toUpperCase() === "RWANDA");

  type ISPCityGroup = {
    isp: string;
    city: string;
    download: number[];
    upload: number[];
    count: number;
  };

  const grouped = new Map<string, ISPCityGroup>();

  rwandaRecords.forEach((record) => {
    const key = `${record.isp ?? "Unknown"}|${record.city ?? "Unknown"}`;
    const current: ISPCityGroup = grouped.get(key) ?? {
      isp: record.isp ?? "Unknown",
      city: record.city ?? "Unknown",
      download: [],
      upload: [],
      count: 0,
    };
    current.download.push(Number(record.download ?? 0));
    current.upload.push(Number(record.upload ?? 0));
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      isp: entry.isp,
      city: entry.city,
      averageDownload: Number(average(entry.download).toFixed(2)),
      averageUpload: Number(average(entry.upload).toFixed(2)),
      testCount: entry.count,
    }))
    .sort((left, right) => right.averageDownload - left.averageDownload)
    .slice(0, 50);
}
