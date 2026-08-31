import express from "express";
import {
  createBirthday,
  deleteBirthday,
  getBirthdays,
  updateBirthday,
} from "../controllers/birthday.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getBirthdays);
router.post("/", protect, createBirthday);
router.patch("/:id", protect, updateBirthday);
router.delete("/:id", protect, deleteBirthday);

export default router;
