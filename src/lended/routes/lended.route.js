import express from "express";
import {
  createLendedEntry,
  deleteLendedEntry,
  getLendedEntries,
  updateLendedEntry,
} from "../controllers/lended.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getLendedEntries);
router.post("/", protect, createLendedEntry);
router.patch("/:id", protect, updateLendedEntry);
router.delete("/:id", protect, deleteLendedEntry);

export default router;
