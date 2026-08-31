import express from "express";
import {
  createBorrowedEntry,
  deleteBorrowedEntry,
  getBorrowedEntries,
  updateBorrowedEntry,
} from "../controllers/borrowed.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getBorrowedEntries);
router.post("/", protect, createBorrowedEntry);
router.patch("/:id", protect, updateBorrowedEntry);
router.delete("/:id", protect, deleteBorrowedEntry);

export default router;
