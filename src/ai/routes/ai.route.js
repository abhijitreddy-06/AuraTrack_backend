import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { aiRateLimiter } from "../middleware/ai-rate-limit.middleware.js";
import { askAi } from "../controllers/ai.controller.js";

const router = express.Router();

router.use(protect);
router.use(aiRateLimiter);
router.post("/", askAi);

export default router;
