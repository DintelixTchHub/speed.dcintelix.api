import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ResponseHandler } from "./ResponseHandler.js";
import { logger } from "../utils/looger.js";

function getErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
	return typeof error.code === "string" ? error.code : undefined;
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
	logger.error("API request failed", {
		method: request.method,
		path: request.originalUrl,
		error,
	});

	if (response.headersSent) return;

	if (error instanceof ZodError) {
		ResponseHandler.error(response, 400, "Validation failed", error.issues);
		return;
	}

	const code = getErrorCode(error);
	if (code === "P2002") {
		ResponseHandler.error(response, 409, "A record with these values already exists");
		return;
	}
	if (code === "P2025") {
		ResponseHandler.error(response, 404, "Requested record was not found");
		return;
	}
	if (code === "P2003") {
		ResponseHandler.error(response, 400, "Related record is invalid");
		return;
	}

	const status =
		typeof error === "object" && error !== null && "status" in error &&
		typeof error.status === "number" && error.status >= 400 && error.status < 500
			? error.status
			: 500;
	const message = status < 500 && error instanceof Error ? error.message : "Internal server error";
	ResponseHandler.error(response, status, message);
};
