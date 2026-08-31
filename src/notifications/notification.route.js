import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { removePushToken, savePushToken } from "./notification.controller.js";

const router = express.Router();
router.post("/push-token", protect, savePushToken);
router.delete("/push-token", protect, removePushToken);
export default router;
