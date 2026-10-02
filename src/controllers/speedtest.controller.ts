import type { Request, Response } from "express";

export function runController(_request: Request, response: Response) {
	response.status(501).json({
		success: false,
		error: "Run speed tests from the browser to measure the visitor's connection.",
	});
}