import type { Request, Response, NextFunction } from "express";

const DEFAULT_SIZE = 10 * 1024 * 1024;
const MAX_SIZE = 250 * 1024 * 1024;
const CHUNK_SIZE = 1024 * 1024;
const chunk = Buffer.allocUnsafe(CHUNK_SIZE);

for (let index = 0; index < CHUNK_SIZE; index++) {
	chunk[index] = (index * 251 + 71) % 251;
}

export async function downloadController(request: Request, response: Response, next: NextFunction) {
	const requestedSize = Number(request.query.size);
	const size = Number.isFinite(requestedSize) && requestedSize > 0
		? Math.min(Math.floor(requestedSize), MAX_SIZE)
		: DEFAULT_SIZE;

	response.status(200).set({
		"Content-Type": "application/octet-stream",
		"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
		Pragma: "no-cache",
		Expires: "0",
		"Content-Encoding": "identity",
		"X-Content-Type-Options": "nosniff",
		"Content-Length": String(size),
	});

	try {
		let bytesSent = 0;
		while (bytesSent < size && !response.destroyed) {
			const remaining = size - bytesSent;
			const nextChunk = remaining >= CHUNK_SIZE ? chunk : chunk.subarray(0, remaining);
			bytesSent += nextChunk.length;

			if (!response.write(nextChunk)) {
				await new Promise<void>((resolve) => {
					const cleanup = () => {
						response.off("drain", cleanup);
						response.off("close", cleanup);
						resolve();
					};
					response.once("drain", cleanup);
					response.once("close", cleanup);
				});
			}
		}

		if (!response.destroyed) response.end();
	} catch (error) {
		next(error);
	}
}
