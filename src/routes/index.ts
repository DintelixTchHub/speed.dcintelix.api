import { Router } from "express";
import downloadRouter from "./download.route.js";
import pingRouter from "./ping.route.js";
import uploadRouter from "./upload.route.js";
import resultRouter from "./result.route.js";
import runRouter from "./run.route.js";

const router = Router();

router.use(downloadRouter);
router.use(uploadRouter);
router.use(pingRouter);
router.use(resultRouter);
router.use(runRouter);

export default router;
