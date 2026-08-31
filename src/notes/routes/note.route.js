import express from "express";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/note.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getNotes);
router.post("/", protect, createNote);
router.patch("/:id", protect, updateNote);
router.delete("/:id", protect, deleteNote);

export default router;
