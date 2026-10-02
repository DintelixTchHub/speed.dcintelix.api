import crypto from "node:crypto";

export type AnalyticsNetworkType = "Wi-Fi" | "Ethernet" | "2G" | "3G" | "4G" | "5G";

export interface SanitizedLocationInput {
  country?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function roundCoordinate(value?: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(2));
}

export function sanitizeText(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeLocation({ country, province, district, city, latitude, longitude }: SanitizedLocationInput) {
  return {
    country: sanitizeText(country),
    province: sanitizeText(province),
    district: sanitizeText(district),
    city: sanitizeText(city),
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
  };
}

export function hashIpAddress(ip?: string | null): string | null {
  if (!ip) return null;
  const normalizedIp = ip.trim().replace(/^::ffff:/i, "");
  const secret = process.env.IP_HASH_SECRET?.trim();
  if (secret) return crypto.createHmac("sha256", secret).update(normalizedIp).digest("hex");
  if (process.env.NODE_ENV === "production") return null;
  return crypto.createHash("sha256").update(normalizedIp).digest("hex");
}

export function normalizeBrowser(browser?: string | null): string | null {
  const value = sanitizeText(browser);
  if (!value) return null;

  const lower = value.toLowerCase();
  if (lower.includes("chrome")) return "Chrome";
  if (lower.includes("firefox")) return "Firefox";
  if (lower.includes("safari")) return "Safari";
  if (lower.includes("edge")) return "Edge";
  if (lower.includes("opera")) return "Opera";
  return value.replace(/\s+\d+.*$/, "").trim() || "Unknown";
}

export function normalizeDeviceType(deviceType?: string | null): string | null {
  const value = sanitizeText(deviceType);
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("mobile")) return "Mobile";
  if (lower.includes("tablet")) return "Tablet";
  if (lower.includes("desktop")) return "Desktop";
  if (lower.includes("tv")) return "TV";
  return value;
}

export function normalizeOS(os?: string | null): string | null {
  const value = sanitizeText(os);
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("windows")) return "Windows";
  if (lower.includes("mac")) return "macOS";
  if (lower.includes("android")) return "Android";
  if (lower.includes("ios") || lower.includes("iphone")) return "iOS";
  if (lower.includes("linux")) return "Linux";
  return value;
}

export function normalizeNetworkType(type?: string | null): AnalyticsNetworkType | null {
  const value = sanitizeText(type);
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("wifi")) return "Wi-Fi";
  if (normalized.includes("ethernet")) return "Ethernet";
  if (normalized.includes("5g")) return "5G";
  if (normalized.includes("4g")) return "4G";
  if (normalized.includes("3g")) return "3G";
  if (normalized.includes("2g")) return "2G";
  if (normalized.includes("cellular")) return "4G";
  return null;
}

export function normalizeServerName(name?: string | null): string | null {
  const value = sanitizeText(name);
  if (!value) return null;
  return value;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

// ============== RWANDA-SPECIFIC HELPERS ==============

export const RWANDA_CITIES = [
  "Kigali",
  "Bugesera",
  "Gasabo",
  "Kicukiro",
  "Muhanga",
  "Musanze",
  "Ruhengeri",
  "Gicumbi",
  "Rulindo",
  "Burera",
  "Bujumbura",
  "Kibungo",
  "Ngoma",
  "Kayonza",
  "Rwamagana",
  "Nyagatare",
  "Gitarama",
  "Karago",
  "Taba",
  "Kabarole",
  "Byumba",
  "Sovu",
  "Kigombe",
  "Kivumu",
  "Kabgayi",
  "Gikongoro",
  "Butare",
  "Huye",
  "Nyakibanda",
  "Gisagara",
  "Gitarama",
  "Kibuye",
  "Karongi",
  "Kemigisha",
  "Rutsiro",
  "Rubavu",
  "Musumba",
  "Gakenke",
  "Murambi",
  "Nkronko",
  "Cyangugu",
  "Kansi",
];

export const RWANDA_PROVINCES = ["Kigali", "Southern", "Eastern", "Northern", "Western"];

export function normalizeRwandaCity(city?: string | null): string | null {
  const value = sanitizeText(city);
  if (!value) return null;

  // Exact match
  const exact = RWANDA_CITIES.find((c) => c.toLowerCase() === value.toLowerCase());
  if (exact) return exact;

  // Partial match
  const partial = RWANDA_CITIES.find((c) => c.toLowerCase().includes(value.toLowerCase()));
  if (partial) return partial;

  return value;
}

export function normalizeRwandaProvince(province?: string | null): string | null {
  const value = sanitizeText(province);
  if (!value) return null;

  const normalized = value.toLowerCase();
  const mapping: Record<string, string> = {
    kigali: "Kigali",
    south: "Southern",
    southern: "Southern",
    south_province: "Southern",
    eastern: "Eastern",
    north: "Northern",
    northern: "Northern",
    north_province: "Northern",
    west: "Western",
    western: "Western",
    west_province: "Western",
  };

  return mapping[normalized] || value;
}

export function validateRwandaCoordinates(latitude?: number | null, longitude?: number | null): boolean {
  // Rwanda approximate bounds
  // Latitude: -1.05 to -2.84
  // Longitude: 28.84 to 30.90
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  return latitude >= -2.84 && latitude <= -1.05 && longitude >= 28.84 && longitude <= 30.9;
}

export function getRwandaRegionFromCoordinates(latitude?: number | null, longitude?: number | null): string | null {
  if (!validateRwandaCoordinates(latitude, longitude)) return null;

  // Approximate regions based on coordinates
  // This is a simplified mapping
  if (latitude && longitude) {
    const lat = latitude;
    const lon = longitude;

    if (lat > -2.0 && lon > 29.5) return "Eastern";
    if (lat > -2.2 && lon < 29.5) return "Northern";
    if (lat < -2.2 && lon < 29.5) return "Western";
    if (lat < -2.2 && lon > 29.5) return "Southern";
    if (lat > -2.0 && lon > 29.8) return "Kigali"; // Kigali area
  }

  return null;
}
