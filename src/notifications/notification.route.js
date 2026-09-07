import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { removePushToken, savePushToken } from "./notification.controller.js";

const router = express.Router();
const logPushTokenRegistration = (req, res, next) => {
  res.once("finish", () => {
    console.info("Push token registration completed", {
      userId: req.user?.id ?? null,
      status: res.statusCode,
      succeeded: res.statusCode >= 200 && res.statusCode < 300,
    });
  });
  next();
};

router.post("/push-token", logPushTokenRegistration, protect, savePushToken);
router.delete("/push-token", protect, removePushToken);
export default router;
