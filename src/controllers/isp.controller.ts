import type { Request, Response, NextFunction } from "express";
import { getISPList as getAnalyticsISPList } from "../services/analytics-db.js";

export async function getISPList(_request: Request, response: Response, next: NextFunction) {
	try {
		response.json(await getAnalyticsISPList());
	} catch (error) {
		next(error);
	}
}

export async function getISPDetails(request: Request, response: Response, next: NextFunction) {
	try {
		const isps = await getAnalyticsISPList("all");
		const isp = isps.find((entry) => entry.id === request.params.id || entry.name === request.params.id);

		if (!isp) {
			response.status(404).json({ success: false, error: "ISP not found" });
			return;
		}

		response.json({ ...isp, servers: [], plans: [] });
	} catch (error) {
		next(error);
	}
}

export async function detectISP(request: Request, response: Response, next: NextFunction) {
	try {
		const clientIp = request.ip?.replace(/^::ffff:/i, "");
		if (!clientIp) {
			response.json({ success: false });
			return;
		}

		const lookupResponse = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(5_000),
		});
		if (!lookupResponse.ok) {
			response.json({ success: false });
			return;
		}

		const lookup = await lookupResponse.json() as {
			success?: boolean;
			connection?: { asn?: number | string; org?: string; isp?: string; domain?: string };
			country?: string;
			country_code?: string;
			city?: string;
			region?: string;
			latitude?: number;
			longitude?: number;
		};
		if (!lookup.success) {
			response.json({ success: false });
			return;
		}

		const asnValue = lookup.connection?.asn;
		const asn = typeof asnValue === "number"
			? asnValue
			: typeof asnValue === "string"
				? Number(asnValue.replace(/^AS/i, ""))
				: null;

		response.json({
			success: true,
			ip: clientIp,
			isp: lookup.connection?.isp ?? "",
			org: lookup.connection?.org ?? "",
			country: lookup.country ?? "",
			countryCode: lookup.country_code ?? "",
			city: lookup.city ?? "",
			region: lookup.region ?? "",
			latitude: typeof lookup.latitude === "number" ? Number(lookup.latitude.toFixed(2)) : null,
			longitude: typeof lookup.longitude === "number" ? Number(lookup.longitude.toFixed(2)) : null,
			connection: {
				asn: Number.isFinite(asn) ? asn : 0,
				org: lookup.connection?.org ?? "",
				isp: lookup.connection?.isp ?? "",
				domain: lookup.connection?.domain ?? "",
			},
		});
	} catch (error) {
		next(error);
	}
}
