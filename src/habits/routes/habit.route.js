import express from "express";

import {
  getHabits,
  createHabit,
  completeHabit,
  updateHabit,
  deleteHabit,
} from "../controllers/habit.controller.js";
import protect from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getHabits);
router.post("/", protect, createHabit);
router.patch("/:id/complete", protect, completeHabit);
router.patch("/:id", protect, updateHabit);
router.delete("/:id", protect, deleteHabit);

export default router;
