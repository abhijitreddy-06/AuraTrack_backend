import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  createPassword,
  deletePassword,
  getPasswords,
  getPasswordSecret,
  updatePassword,
} from "../controllers/password.controller.js";

const router = express.Router();

router.get("/", protect, getPasswords);
router.get("/:id/secret", protect, getPasswordSecret);
router.post("/", protect, createPassword);
router.patch("/:id", protect, updatePassword);
router.delete("/:id", protect, deletePassword);

export default router;
