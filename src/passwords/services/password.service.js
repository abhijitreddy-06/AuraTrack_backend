import { PasswordEntry } from "../models/password.model.js";
import { User } from "../../auth/models/auth.model.js";
import { UserVaultKey } from "../models/userVaultKey.model.js";

/** Build and throw a typed HTTP error. */
const fail = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Row-shape helpers ─────────────────────────────────────────────────────────

/**
 * v2: backend is blind — returns raw ciphertext strings exactly as stored.
 * The client decrypts using its in-memory DEK.
 */
const v2PublicEntry = (entry) => ({
  id: entry.id,
  title: entry.title,
  key: entry.key_,
  value: entry.value_,
  created_at: entry.created_at,
});

const summaryEntry = (entry) => ({
  id: entry.id,
  title: entry.title,
  created_at: entry.created_at,
});

// ── v2 validation (client pre-encrypted; backend stores opaque ciphertext) ────

/**
 * For v2, the client sends already-encrypted ciphertext in body fields
 * key_ and value_ (DB column names).
 * The backend stores these blindly without decryption.
 */
const validateV2 = (data, partial = false) => {
  const values = {};
  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim())
      fail("Title is required", 400);
    if (data.title.trim().length > 200)
      fail("Title must be 200 characters or fewer", 400);
    values.title = data.title.trim();
  }
  if (!partial || data.key_ !== undefined) {
    if (typeof data.key_ !== "string" || !data.key_.trim())
      fail("Encrypted key is required", 400);
    values.key_ = data.key_.trim();
  }
  if (!partial || data.value_ !== undefined) {
    if (typeof data.value_ !== "string" || !data.value_.trim())
      fail("Encrypted value is required", 400);
    values.value_ = data.value_.trim();
  }
  if (partial && !Object.keys(values).length)
    fail("Provide password fields to update", 400);
  return values;
};

// ─── CRUD service functions ───────────────────────────────────────────────────

export const getPasswordEntries = async (userId) =>
  (
    await PasswordEntry.findAll({
      where: { user_id: userId },
      order: [["title", "ASC"]],
    })
  ).map(summaryEntry);

/**
 * GET /api/passwords/:id/secret
 * Backend is blind storage — returns raw ciphertext; client decrypts with in-memory DEK.
 */
export const getPasswordSecret = async (userId, id) => {
  if (!uuid.test(id)) fail("Invalid password entry ID", 400);
  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });
  if (!entry) fail("Password entry not found", 404);
  return v2PublicEntry(entry);
};

/**
 * POST /api/passwords
 * Expects { title, key_, value_ } — server stores ciphertext as-is.
 */
export const createPasswordEntry = async (userId, data) => {
  const values = validateV2(data);
  return summaryEntry(
    await PasswordEntry.create({ user_id: userId, ...values }),
  );
};

/**
 * PATCH /api/passwords/:id
 * Expects { title?, key_?, value_? } — server stores ciphertext as-is.
 */
export const updatePasswordEntry = async (userId, id, data) => {
  if (!uuid.test(id)) fail("Invalid password entry ID", 400);
  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });
  if (!entry) fail("Password entry not found", 404);
  const values = validateV2(data, true);
  await entry.update(values);
  return summaryEntry(entry);
};

export const deletePasswordEntry = async (userId, id) => {
  if (!uuid.test(id)) fail("Invalid password entry ID", 400);
  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });
  if (!entry) fail("Password entry not found", 404);
  await entry.destroy();
};

// ─── Phase 3: normal v2 vault initialisation ─────────────────────────────────

/**
 * POST /api/passwords/vault/init — for accounts setting up their v2 vault.
 *
 * Stores the wrapped DEK and ensures vault_version is 'v2'.
 *
 * Idempotency:
 *  1. Row exists AND wrapped_dek IS NOT NULL → no-op, return existing.
 *  2. Row exists, wrapped_dek IS NULL        → update + set vault_version = 'v2'.
 *  3. No row                                 → insert + set vault_version = 'v2'.
 */
export const initializeV2Vault = async (userId, data) => {
  const {
    kdf_salt,
    kdf_params,
    wrapped_dek,
    wrapped_dek_nonce,
    recovery_kdf_salt,
    recovery_kdf_params,
    recovery_wrapped_dek,
    recovery_wrapped_dek_nonce,
  } = data;

  if (
    typeof kdf_salt !== "string" ||
    !kdf_salt.trim() ||
    typeof kdf_params !== "object" ||
    kdf_params === null ||
    typeof wrapped_dek !== "string" ||
    !wrapped_dek.trim() ||
    typeof wrapped_dek_nonce !== "string" ||
    !wrapped_dek_nonce.trim()
  ) {
    fail("Missing or invalid vault initialisation fields", 400);
  }

  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version"],
  });
  if (!user) fail("User not found", 404);

  const updateFields = { kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce };
  if (recovery_wrapped_dek && recovery_kdf_salt) {
    updateFields.recovery_kdf_salt = recovery_kdf_salt;
    updateFields.recovery_kdf_params = recovery_kdf_params;
    updateFields.recovery_wrapped_dek = recovery_wrapped_dek;
    updateFields.recovery_wrapped_dek_nonce = recovery_wrapped_dek_nonce;
  }

  const existing = await UserVaultKey.findOne({ where: { user_id: userId } });
  if (existing) {
    if (existing.wrapped_dek !== null) {
      if (recovery_wrapped_dek && !existing.recovery_wrapped_dek) {
        await existing.update({
          recovery_kdf_salt,
          recovery_kdf_params,
          recovery_wrapped_dek,
          recovery_wrapped_dek_nonce,
        });
  try {
    const existing = await UserVaultKey.findOne({ where: { user_id: userId } });
    if (existing) {
      if (existing.wrapped_dek !== null) {
        if (recovery_wrapped_dek && !existing.recovery_wrapped_dek) {
          await existing.update({
            recovery_kdf_salt,
            recovery_kdf_params,
            recovery_wrapped_dek,
            recovery_wrapped_dek_nonce,
          });
        }
        return { alreadyInitialized: true, vault_version: user.vault_version };
      }
      return { alreadyInitialized: true, vault_version: user.vault_version };
      await existing.update(updateFields);
    } else {
      await UserVaultKey.create({ user_id: userId, ...updateFields });
    }
    await existing.update(updateFields);
  } else {
    await UserVaultKey.create({ user_id: userId, ...updateFields });
  } catch (err) {
    if (
      err.name === "SequelizeUniqueConstraintError" ||
      err.original?.code === "23505"
    ) {
      // Race condition: concurrent device already initialized the vault
      const current = await UserVaultKey.findOne({ where: { user_id: userId } });
      if (current && current.wrapped_dek !== null) {
        return { alreadyInitialized: true, vault_version: user.vault_version };
      }
    }
    throw err;
  }

  if (user.vault_version !== "v2") {
    await user.update({ vault_version: "v2" });
  }

  return { alreadyInitialized: false, vault_version: "v2" };
};

// ─── Vault metadata ──────────────────────────────────────────────────────────

/**
 * GET /api/passwords/metadata
 *
 * Returns vault metadata for the requesting user including recovery metadata.
 */
export const getUserVaultMetadata = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version"],
  });
  if (!user) fail("User not found", 404);

  const vaultVersion = user.vault_version ?? "v2";

  const vaultKey = await UserVaultKey.findOne({
    where: { user_id: userId },
    attributes: [
      "kdf_salt",
      "kdf_params",
      "wrapped_dek",
      "wrapped_dek_nonce",
      "recovery_kdf_salt",
      "recovery_kdf_params",
      "recovery_wrapped_dek",
      "recovery_wrapped_dek_nonce",
    ],
  });

  return {
    vault_version: vaultVersion,
    kdf_salt: vaultKey?.kdf_salt ?? null,
    kdf_params: vaultKey?.kdf_params ?? null,
    wrapped_dek: vaultKey?.wrapped_dek ?? null,
    wrapped_dek_nonce: vaultKey?.wrapped_dek_nonce ?? null,
    recovery_kdf_salt: vaultKey?.recovery_kdf_salt ?? null,
    recovery_kdf_params: vaultKey?.recovery_kdf_params ?? null,
    recovery_wrapped_dek: vaultKey?.recovery_wrapped_dek ?? null,
    recovery_wrapped_dek_nonce: vaultKey?.recovery_wrapped_dek_nonce ?? null,
  };
};

// ─── Phase 8: Recovery metadata ───────────────────────────────────────────────

/**
 * POST /api/passwords/vault/recovery
 *
 * Sets or updates recovery key metadata for an existing vault.
 */
export const setVaultRecoveryMetadata = async (userId, data) => {
  const {
    recovery_kdf_salt,
    recovery_kdf_params,
    recovery_wrapped_dek,
    recovery_wrapped_dek_nonce,
  } = data;

  if (
    typeof recovery_kdf_salt !== "string" ||
    !recovery_kdf_salt.trim() ||
    typeof recovery_kdf_params !== "object" ||
    recovery_kdf_params === null ||
    typeof recovery_wrapped_dek !== "string" ||
    !recovery_wrapped_dek.trim() ||
    typeof recovery_wrapped_dek_nonce !== "string" ||
    !recovery_wrapped_dek_nonce.trim()
  ) {
    fail("Missing or invalid recovery metadata fields", 400);
  }

  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version"],
  });
  if (!user) fail("User not found", 404);

  const existing = await UserVaultKey.findOne({ where: { user_id: userId } });
  if (!existing) {
    fail("Vault must be initialized before setting recovery metadata", 400);
  }

  await existing.update({
    recovery_kdf_salt,
    recovery_kdf_params,
    recovery_wrapped_dek,
    recovery_wrapped_dek_nonce,
  });

  return { success: true };
};
