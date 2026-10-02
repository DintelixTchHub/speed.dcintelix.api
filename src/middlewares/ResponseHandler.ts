import type { Request, RequestHandler, Response } from "express";

export class ResponseHandler {
	static error(
		response: Response,
		status: number,
		error: string,
		details?: unknown,
	) {
		return response.status(status).json({
			success: false,
			error,
			...(details === undefined ? {} : { details }),
		});
	}

	static notFound: RequestHandler = (_request: Request, response: Response) => {
		return ResponseHandler.error(response, 404, "Not found");
	};
}
