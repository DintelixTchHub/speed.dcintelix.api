import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../utils/looger.js";

export const requestLogger: RequestHandler = (request, response, next) => {
	const requestId = randomUUID();
	const startedAt = process.hrtime.bigint();
	let logged = false;
	response.setHeader("X-Request-Id", requestId);

	const logCompletion = () => {
		if (logged) return;
		logged = true;

		logger.info("HTTP request completed", {
			requestId,
			method: request.method,
			path: request.path,
			statusCode: response.statusCode,
			durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
			aborted: !response.writableFinished,
		});
	};

	response.once("finish", logCompletion);
	response.once("close", logCompletion);
	next();
};