import express from "express";
import { createIncome, deleteIncome, getIncomes, updateIncome } from "../controllers/income.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/", protect, getIncomes);
router.post("/", protect, createIncome);
router.patch("/:id", protect, updateIncome);
router.delete("/:id", protect, deleteIncome);
export default router;
