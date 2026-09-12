import * as service from "../services/password.service.js";

// ─── Metadata + vault init ─────────────────────────────────────────────────────

export const getVaultMetadata = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.getUserVaultMetadata(req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const initVault = async (req, res, next) => {
  try {
    const result = await service.initializeV2Vault(req.user.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const setRecoveryMetadata = async (req, res, next) => {
  try {
    const result = await service.setVaultRecoveryMetadata(req.user.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getPasswords = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.getPasswordEntries(req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const getPasswordSecret = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.getPasswordSecret(req.user.id, req.params.id),
    });
  } catch (error) {
    next(error);
  }
};

export const createPassword = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.createPasswordEntry(req.user.id, req.body),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.updatePasswordEntry(req.user.id, req.params.id, req.body),
    });
  } catch (error) {
    next(error);
  }
};

export const deletePassword = async (req, res, next) => {
  try {
    await service.deletePasswordEntry(req.user.id, req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Phase 6: Migration controllers ──────────────────────────────────────────

/**
 * POST /api/passwords/migration/start
 *
 * Initialises the migration DEK for a v1 user.
 * vault_version remains 'v1' until /migration/complete succeeds.
 * Idempotent: a second call returns the existing wrapped_dek unchanged.
 */
export const migrationStart = async (req, res, next) => {
  try {
    const result = await service.startVaultMigration(req.user.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/passwords/migration/v1-export
 *
 * Returns all entries with their v1 plaintext for immediate re-encryption.
 * Strictly gated: only available to v1 users with migration_status = 'in_progress'.
 * v2 users receive 403.
 * Plaintext is NEVER logged.
 */
export const migrationExport = async (req, res, next) => {
  try {
    const entries = await service.exportV1EntriesForMigration(req.user.id);
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/passwords/migration/upload-entries
 *
 * Batch-updates entries with v2 ciphertext produced by the client.
 * Only for v1 users in migration. Idempotent.
 */
export const migrationUpload = async (req, res, next) => {
  try {
    const results = await service.uploadMigratedEntries(
      req.user.id,
      req.body.entries,
    );
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/passwords/migration/complete
 *
 * Verifies all entries are in v2 format, then flips vault_version to 'v2'.
 * After this, the migration export endpoint rejects this user.
 */
export const migrationComplete = async (req, res, next) => {
  try {
    const result = await service.finalizeVaultMigration(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
