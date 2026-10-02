import type { Request, Response, NextFunction } from "express";

const MAX_UPLOAD_SIZE = 250 * 1024 * 1024;

export async function uploadController(request: Request, response: Response, next: NextFunction) {
	const declaredLength = request.headers["content-length"];
	const declaredSize = Number(declaredLength);
	if (
		declaredLength &&
		(!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > MAX_UPLOAD_SIZE)
	) {
		request.resume();
		response.set("Cache-Control", "no-store").status(413).json({
			success: false,
			error: "Upload size exceeds the allowed limit",
		});
		return;
	}

	let totalBytes = 0;

	try {
		for await (const chunk of request) {
			totalBytes += chunk.length;
			if (totalBytes > MAX_UPLOAD_SIZE) {
				request.resume();
				response.set("Cache-Control", "no-store").status(413).json({
					success: false,
					error: "Upload size exceeds the allowed limit",
				});
				return;
			}
		}

		response
			.set({
				"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
				Pragma: "no-cache",
				Expires: "0",
				"X-Content-Type-Options": "nosniff",
			})
			.status(200)
			.json({ success: true, bytesReceived: totalBytes });
	} catch (error) {
		if (request.aborted || response.destroyed) return;
		next(error);
	}
}
