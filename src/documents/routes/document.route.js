import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  createDocument,
  deleteDocument,
  downloadDocument,
  listDocuments,
} from "../controllers/document.controller.js";

const router = express.Router();

router.get("/", protect, listDocuments);
router.post("/", protect, createDocument);
router.get("/:id/download", protect, downloadDocument);
router.delete("/:id", protect, deleteDocument);

export default router;
