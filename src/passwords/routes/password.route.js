import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  createPassword,
  deletePassword,
  getPasswords,
  getPasswordSecret,
  getVaultMetadata,
  initVault,
  migrationComplete,
  migrationExport,
  migrationStart,
  migrationUpload,
  setRecoveryMetadata,
  updatePassword,
} from "../controllers/password.controller.js";
// Import model so Sequelize registers the table and its User association at startup.
import "../models/userVaultKey.model.js";

const router = express.Router();

router.get("/metadata", protect, getVaultMetadata);
router.post("/vault/init", protect, initVault);
router.post("/vault/recovery", protect, setRecoveryMetadata);

// Phase 6 migration routes (must be defined before /:id routes)
router.post("/migration/start", protect, migrationStart);
router.post("/migration/v1-export", protect, migrationExport);
router.post("/migration/upload-entries", protect, migrationUpload);
router.post("/migration/complete", protect, migrationComplete);

router.get("/", protect, getPasswords);
router.get("/:id/secret", protect, getPasswordSecret);
router.post("/", protect, createPassword);
router.patch("/:id", protect, updatePassword);
router.delete("/:id", protect, deletePassword);

export default router;
