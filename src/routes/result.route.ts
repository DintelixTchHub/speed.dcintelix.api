import { Router } from "express";
import { resultController } from "../controllers/result.controller.js";
import { rateLimit } from "../middlewares/ratelimit.js";

const router = Router();

router.post("/result", rateLimit({ windowMs: 60_000, max: 30 }), resultController);

export default router;