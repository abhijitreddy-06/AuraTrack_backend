import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  createPassword,
  deletePassword,
  getPasswords,
  getPasswordSecret,
  getVaultMetadata,
  initVault,
  setRecoveryMetadata,
  updatePassword,
} from "../controllers/password.controller.js";
// Import model so Sequelize registers the table and its User association at startup.
import "../models/userVaultKey.model.js";

const router = express.Router();

router.get("/metadata", protect, getVaultMetadata);
router.post("/vault/init", protect, initVault);
router.post("/vault/recovery", protect, setRecoveryMetadata);

router.get("/", protect, getPasswords);
router.get("/:id/secret", protect, getPasswordSecret);
router.post("/", protect, createPassword);
router.patch("/:id", protect, updatePassword);
router.delete("/:id", protect, deletePassword);

export default router;
