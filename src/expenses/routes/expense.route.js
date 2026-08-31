import express from "express";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "../controllers/expense.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getExpenses);
router.post("/", protect, createExpense);
router.patch("/:id", protect, updateExpense);
router.delete("/:id", protect, deleteExpense);

export default router;
