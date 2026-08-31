import express from "express";
import {
  signup,
  login,
  refreshToken,
  logout,
  me,
} from "../controllers/auth.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/singup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, me);

export default router;
