import { Router } from "express";
import { detectISP, getISPDetails, getISPList } from "../controllers/isp.controller.js";
import { rateLimit } from "../middlewares/ratelimit.js";

const router = Router();

router.get("/", getISPList);
router.get("/detect", rateLimit({ windowMs: 60_000, max: 10 }), detectISP);
router.get("/:id", getISPDetails);

export default router;
