import type { RequestHandler } from "express";
import { ResponseHandler } from "./ResponseHandler.js";

interface RateLimitOptions {
	windowMs?: number;
	max?: number;
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const clients = new Map<string, RateLimitEntry>();

const cleanupTimer = setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of clients) {
		if (entry.resetAt <= now) clients.delete(key);
	}
}, 60_000);
cleanupTimer.unref();

export function rateLimit({ windowMs = 60_000, max = 60 }: RateLimitOptions = {}): RequestHandler {
	return (request, response, next) => {
		const now = Date.now();
		const key = request.ip || request.socket.remoteAddress || "unknown";
		let entry = clients.get(key);

		if (!entry || entry.resetAt <= now) {
			entry = { count: 0, resetAt: now + windowMs };
		}

		entry.count += 1;
		clients.set(key, entry);

		const remaining = Math.max(0, max - entry.count);
		const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
		response.set({
			"RateLimit-Limit": String(max),
			"RateLimit-Remaining": String(remaining),
			"RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
		});

		if (entry.count > max) {
			response.set("Retry-After", String(retryAfterSeconds));
			ResponseHandler.error(response, 429, "Too many requests", { retryAfter: retryAfterSeconds });
			return;
		}

		next();
	};
}
