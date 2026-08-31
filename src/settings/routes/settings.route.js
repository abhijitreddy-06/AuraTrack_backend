import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  getSettings,
  updateEmail,
  updateAppLock,
  updatePassword,
  updateTheme,
  deleteAccount,
} from "../controllers/settings.controller.js";

const router = express.Router();

router.get("/", protect, getSettings);
router.patch("/theme", protect, updateTheme);
router.patch("/app-lock", protect, updateAppLock);
router.patch("/email", protect, updateEmail);
router.patch("/password", protect, updatePassword);
router.delete("/account", protect, deleteAccount);

export default router;
