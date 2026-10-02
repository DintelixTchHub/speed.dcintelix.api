import { Router } from "express";
import { handleAnalyticsRequest } from "../controllers/analytics.controller.js";
import { rateLimit } from "../middlewares/ratelimit.js";

const router = Router();

router.post("/submit", rateLimit({ windowMs: 60_000, max: 30 }), handleAnalyticsRequest);
router.all("*", handleAnalyticsRequest);

export default router;
