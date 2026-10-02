import { Router } from "express";
import { runController } from "../controllers/speedtest.controller.js";

const router = Router();

router.post("/run", runController);

export default router;