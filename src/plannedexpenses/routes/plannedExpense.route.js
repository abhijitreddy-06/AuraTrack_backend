import express from "express";
import { createPlannedExpense, deletePlannedExpense, getPlannedExpenses, updatePlannedExpense } from "../controllers/plannedExpense.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getPlannedExpenses);
router.post("/", protect, createPlannedExpense);
router.patch("/:id", protect, updatePlannedExpense);
router.delete("/:id", protect, deletePlannedExpense);

export default router;
