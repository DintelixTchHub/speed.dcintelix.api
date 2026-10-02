import type { Request, Response } from "express";

const noCacheHeaders = {
	"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
	Pragma: "no-cache",
	Expires: "0",
};

export function pingController(_request: Request, response: Response) {
	response.set(noCacheHeaders).json({ success: true, timestamp: Date.now() });
}

export function pingProbeController(_request: Request, response: Response) {
	response.set(noCacheHeaders).status(200).end();
}
