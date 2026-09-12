import crypto from "crypto";
import { PasswordEntry } from "../models/password.model.js";
import { User } from "../../auth/models/auth.model.js";
import { UserVaultKey } from "../models/userVaultKey.model.js";

// ─── v1 server-side encryption (PASSWORD_VAULT_KEY) ───────────────────────────
// Used exclusively for vault_version = 'v1'. NEVER used for v2 users.

const key = process.env.PASSWORD_VAULT_KEY;

if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
  throw new Error("PASSWORD_VAULT_KEY must be a 64-character hexadecimal key");
}

const encryptionKey = Buffer.from(key, "hex");

/** Build and throw a typed HTTP error. */
const fail = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Ciphertext format discriminator ───────────────────────────────────────────
// v1 format:  base64:base64:base64   (AES-256-GCM iv:tag:ciphertext, colons)
// v2 format:  base64url.base64url    (XChaCha20-Poly1305 nonce.ciphertext, dot)
const isV1Format = (str) =>
  typeof str === "string" && str.includes(":") && !str.includes(".");

// ── v1 encryption helpers ─────────────────────────────────────────────────────

const v1Encrypt = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
};

const v1Decrypt = (payload) => {
  const [iv, tag, data] = payload.split(":").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};

// ── Row-shape helpers ─────────────────────────────────────────────────────────

/** v1: server decrypts and returns plaintext key/value. */
const v1PublicEntry = (entry) => ({
  id: entry.id,
  title: entry.title,
  key: v1Decrypt(entry.key_),
  value: v1Decrypt(entry.value_),
  created_at: entry.created_at,
});

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

// ── Vault version lookup ──────────────────────────────────────────────────────

/**
 * Look up the user's vault_version from the database.
 * Required because the `protect` middleware only loads id/email/name —
 * not vault_version — into req.user.
 */
const getVaultVersion = async (userId) => {
  const user = await User.findByPk(userId, { attributes: ["vault_version"] });
  return user ? (user.vault_version ?? "v1") : "v1";
};

// ── v1 validation (server encrypts the values) ────────────────────────────────

const validateV1 = (data, partial = false) => {
  const values = {};
  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) fail("Title is required", 400);
    if (data.title.trim().length > 200) fail("Title must be 200 characters or fewer", 400);
    values.title = data.title.trim();
  }
  if (!partial || data.key !== undefined) {
    if (typeof data.key !== "string" || !data.key.trim()) fail("Username or email is required", 400);
    values.key_ = v1Encrypt(data.key.trim());
  }
  if (!partial || data.value !== undefined) {
    if (typeof data.value !== "string" || !data.value.trim()) fail("Password is required", 400);
    values.value_ = v1Encrypt(data.value);
  }
  if (partial && !Object.keys(values).length) fail("Provide password fields to update", 400);
  return values;
};

// ── v2 validation (client pre-encrypted; backend stores opaque ciphertext) ────

/**
 * For v2, the client sends already-encrypted ciphertext in body fields
 * key_ and value_ (DB column names, not "key"/"value").
 * The backend must never pass these through PASSWORD_VAULT_KEY.
 */
const validateV2 = (data, partial = false) => {
  const values = {};
  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) fail("Title is required", 400);
    if (data.title.trim().length > 200) fail("Title must be 200 characters or fewer", 400);
    values.title = data.title.trim();
  }
  if (!partial || data.key_ !== undefined) {
    if (typeof data.key_ !== "string" || !data.key_.trim()) fail("Encrypted key is required", 400);
    values.key_ = data.key_.trim();
  }
  if (!partial || data.value_ !== undefined) {
    if (typeof data.value_ !== "string" || !data.value_.trim()) fail("Encrypted value is required", 400);
    values.value_ = data.value_.trim();
  }
  if (partial && !Object.keys(values).length) fail("Provide password fields to update", 400);
  return values;
};

// ─── CRUD service functions ───────────────────────────────────────────────────

export const getPasswordEntries = async (userId) =>
  (await PasswordEntry.findAll({ where: { user_id: userId }, order: [["title", "ASC"]] })).map(summaryEntry);

/**
 * GET /api/passwords/:id/secret
 * v1: server decrypts with PASSWORD_VAULT_KEY → returns plaintext.
 * v2: server returns raw ciphertext → client decrypts with in-memory DEK.
 */
export const getPasswordSecret = async (userId, id) => {
  if (!uuid.test(id)) fail("Invalid password entry ID", 400);
  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });
  if (!entry) fail("Password entry not found", 404);
  const version = await getVaultVersion(userId);
  return version === "v2" ? v2PublicEntry(entry) : v1PublicEntry(entry);
};

/**
 * POST /api/passwords
 * v1: expects { title, key, value } — server encrypts.
 * v2: expects { title, key_, value_ } — server stores ciphertext as-is.
 */
export const createPasswordEntry = async (userId, data) => {
  const version = await getVaultVersion(userId);
  const values = version === "v2" ? validateV2(data) : validateV1(data);
  return summaryEntry(await PasswordEntry.create({ user_id: userId, ...values }));
};

/**
 * PATCH /api/passwords/:id
 * v1: expects { title?, key?, value? } — server re-encrypts changed fields.
 * v2: expects { title?, key_?, value_? } — server stores ciphertext as-is.
 */
export const updatePasswordEntry = async (userId, id, data) => {
  if (!uuid.test(id)) fail("Invalid password entry ID", 400);
  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });
  if (!entry) fail("Password entry not found", 404);
  const version = await getVaultVersion(userId);
  const values = version === "v2" ? validateV2(data, true) : validateV1(data, true);
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
 * POST /api/passwords/vault/init — for brand-new v2 accounts (not migration).
 *
 * Stores the wrapped DEK and immediately flips vault_version to 'v2'.
 * This is the non-migration path used by new users who sign up as v2 from day 1.
 *
 * Idempotency:
 *  1. Row exists AND wrapped_dek IS NOT NULL → no-op, return existing.
 *  2. Row exists, wrapped_dek IS NULL        → update + flip vault_version.
 *  3. No row                                 → insert + flip vault_version.
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
    typeof kdf_salt !== "string" || !kdf_salt.trim() ||
    typeof kdf_params !== "object" || kdf_params === null ||
    typeof wrapped_dek !== "string" || !wrapped_dek.trim() ||
    typeof wrapped_dek_nonce !== "string" || !wrapped_dek_nonce.trim()
  ) {
    fail("Missing or invalid vault initialisation fields", 400);
  }

  const user = await User.findByPk(userId, { attributes: ["id", "vault_version"] });
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
      }
      return { alreadyInitialized: true, vault_version: user.vault_version };
    }
    await existing.update({ kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce });
    await existing.update(updateFields);
  } else {
    await UserVaultKey.create({ user_id: userId, kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce });
    await UserVaultKey.create({ user_id: userId, ...updateFields });
  }

  if (user.vault_version !== "v2") {
    await user.update({ vault_version: "v2", migration_status: "completed" });
  }

  return { alreadyInitialized: false, vault_version: "v2" };
};

// ─── Phase 2/6: vault metadata ────────────────────────────────────────────────
// ─── Phase 2/6/8: vault metadata ──────────────────────────────────────────────

/**
 * GET /api/passwords/metadata
 *
 * Returns vault metadata for the requesting user.
 * Now includes migration_status and exposes kdf_salt/wrapped_dek for
 * v1 users who have started migration (so the frontend can resume with
 * the original salt/wrapped_dek on retry).
 * Returns vault metadata for the requesting user including recovery metadata.
 */
export const getUserVaultMetadata = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version", "migration_status"],
  });
  if (!user) fail("User not found", 404);

  const vaultVersion = user.vault_version ?? "v1";
  const migrationStatus = user.migration_status ?? "not_started";

  // Always look up user_vault_keys — even v1 users in migration have a row.
  const vaultKey = await UserVaultKey.findOne({
    where: { user_id: userId },
    attributes: ["kdf_salt", "kdf_params", "wrapped_dek", "wrapped_dek_nonce"],
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
    migration_status: migrationStatus,
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

// ─── Phase 6: Migration ───────────────────────────────────────────────────────
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
    typeof recovery_kdf_salt !== "string" || !recovery_kdf_salt.trim() ||
    typeof recovery_kdf_params !== "object" || recovery_kdf_params === null ||
    typeof recovery_wrapped_dek !== "string" || !recovery_wrapped_dek.trim() ||
    typeof recovery_wrapped_dek_nonce !== "string" || !recovery_wrapped_dek_nonce.trim()
  ) {
    fail("Missing or invalid recovery metadata fields", 400);
  }

  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version", "migration_status"],
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

// ─── Phase 6/8: Migration ─────────────────────────────────────────────────────

/**
 * POST /api/passwords/migration/start
 *
 * Initialises the migration DEK for a v1 user WITHOUT flipping vault_version.
 * vault_version stays 'v1' until finalizeVaultMigration() succeeds.
 *
 * Idempotency:
 *  - If wrapped_dek already exists, the EXISTING record is returned unchanged.
 *    The client must use the existing kdf_salt to derive the correct KEK.
 *  - If the row exists but wrapped_dek is null, it is updated with the new data.
 *  - If no row exists, a new row is inserted.
 *
 * In all cases, migration_status is set to 'in_progress'.
 * Initialises the migration DEK and recovery metadata for a v1 user WITHOUT flipping vault_version.
 */
export const startVaultMigration = async (userId, data) => {
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
    typeof kdf_salt !== "string" || !kdf_salt.trim() ||
    typeof kdf_params !== "object" || kdf_params === null ||
    typeof wrapped_dek !== "string" || !wrapped_dek.trim() ||
    typeof wrapped_dek_nonce !== "string" || !wrapped_dek_nonce.trim()
  ) {
    fail("Missing or invalid migration initialisation fields", 400);
  }

  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version", "migration_status"],
  });
  if (!user) fail("User not found", 404);
  if (user.vault_version === "v2") {
    fail("User is already on v2 — migration not applicable", 400);
  }

  const existing = await UserVaultKey.findOne({ where: { user_id: userId } });

  const updateFields = { kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce };
  if (recovery_wrapped_dek && recovery_kdf_salt) {
    updateFields.recovery_kdf_salt = recovery_kdf_salt;
    updateFields.recovery_kdf_params = recovery_kdf_params;
    updateFields.recovery_wrapped_dek = recovery_wrapped_dek;
    updateFields.recovery_wrapped_dek_nonce = recovery_wrapped_dek_nonce;
  }

  if (existing && existing.wrapped_dek !== null) {
    // Already started — return the EXISTING record so the client re-derives the
    // KEK with the ORIGINAL salt, not the new one passed in this request.
    if (user.migration_status !== "in_progress") {
      await user.update({ migration_status: "in_progress" });
    }
    // If recovery metadata was passed now and was missing, update it
    if (recovery_wrapped_dek && !existing.recovery_wrapped_dek) {
      await existing.update({
        recovery_kdf_salt,
        recovery_kdf_params,
        recovery_wrapped_dek,
        recovery_wrapped_dek_nonce,
      });
    }
    return {
      alreadyStarted: true,
      kdf_salt: existing.kdf_salt,
      kdf_params: existing.kdf_params,
      wrapped_dek: existing.wrapped_dek,
      wrapped_dek_nonce: existing.wrapped_dek_nonce,
      recovery_kdf_salt: existing.recovery_kdf_salt,
      recovery_kdf_params: existing.recovery_kdf_params,
      recovery_wrapped_dek: existing.recovery_wrapped_dek,
      recovery_wrapped_dek_nonce: existing.recovery_wrapped_dek_nonce,
    };
  }

  if (existing) {
    // Row exists but wrapped_dek is null (e.g. failed before storing DEK).
    await existing.update({ kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce });
    await existing.update(updateFields);
  } else {
    await UserVaultKey.create({ user_id: userId, kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce });
    await UserVaultKey.create({ user_id: userId, ...updateFields });
  }

  await user.update({ migration_status: "in_progress" });
  return { alreadyStarted: false, kdf_salt, kdf_params, wrapped_dek, wrapped_dek_nonce };
  return {
    alreadyStarted: false,
    ...updateFields,
  };
};

/**
 * POST /api/passwords/migration/v1-export  —  MIGRATION ONLY, STRICTLY GATED.
 *
 * Returns the user's existing v1 Password Manager entries with their plaintext
 * key and value temporarily decrypted for immediate client-side re-encryption.
 *
 * Security constraints:
 *  - Requires vault_version = 'v1'. v2 users are immediately rejected (403).
 *  - Requires migration_status = 'in_progress'. Prevents arbitrary plaintext export.
 *  - Entries already in v2 format (already_migrated = true) are returned with
 *    key = null / value = null — the server will not attempt to decrypt them.
 *  - Plaintext is NEVER logged anywhere in this function.
 */
export const exportV1EntriesForMigration = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version", "migration_status"],
  });
  if (!user) fail("User not found", 404);

  if (user.vault_version === "v2") {
    fail("Legacy migration export is not available for v2 users", 403);
  }
  if (user.migration_status !== "in_progress") {
    fail(
      "Migration export is only available while migration is in_progress. " +
        "Call /api/passwords/migration/start first.",
      403,
    );
  }

  const entries = await PasswordEntry.findAll({
    where: { user_id: userId },
    order: [["created_at", "ASC"]],
    attributes: ["id", "title", "key_", "value_", "created_at"],
  });

  return entries.map((entry) => {
    const v1 = isV1Format(entry.key_);
    return {
      id: entry.id,
      title: entry.title,
      // Plaintext exposed ONLY for entries still in v1 format.
      // Already-migrated entries return null so the client skips them.
      key: v1 ? v1Decrypt(entry.key_) : null,
      value: v1 ? v1Decrypt(entry.value_) : null,
      already_migrated: !v1,
      created_at: entry.created_at,
    };
  });
};

/**
 * POST /api/passwords/migration/upload-entries
 *
 * Batch-updates Password Manager entries with v2 ciphertext produced
 * by the client during migration.
 *
 * Constraints:
 *  - v2 users are rejected (403) — there is nothing left to migrate.
 *  - migration_status must be 'in_progress'.
 *  - Each entry must belong to the requesting user.
 *  - Ciphertext is stored blindly; the backend does not decrypt it.
 *  - Idempotent: re-uploading the same entry just overwrites with the same value.
 */
export const uploadMigratedEntries = async (userId, entries) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version", "migration_status"],
  });
  if (!user) fail("User not found", 404);
  if (user.vault_version === "v2") fail("Cannot upload migration entries for a v2 user", 403);
  if (user.migration_status !== "in_progress") fail("Migration is not in progress", 403);

  if (!Array.isArray(entries) || entries.length === 0) {
    fail("entries must be a non-empty array", 400);
  }

  const results = [];
  for (const item of entries) {
    const { id, key_, value_ } = item;
    if (!uuid.test(id)) fail(`Invalid entry ID: ${id}`, 400);
    if (typeof key_ !== "string" || !key_.trim()) fail(`key_ is required for entry ${id}`, 400);
    if (typeof value_ !== "string" || !value_.trim()) fail(`value_ is required for entry ${id}`, 400);

    const record = await PasswordEntry.findOne({ where: { id, user_id: userId } });
    if (!record) fail(`Entry not found: ${id}`, 404);

    await record.update({ key_: key_.trim(), value_: value_.trim() });
    results.push({ id, success: true });
  }

  return results;
};

/**
 * POST /api/passwords/migration/complete
 *
 * Finalises migration by flipping vault_version = 'v2' and
 * migration_status = 'completed'.
 *
 * Before flipping, verifies that NO entries still carry v1-format ciphertext.
 * If any remain, the request is rejected with a 400 so the client must finish
 * uploading all entries first.
 *
 * After this call, the legacy migration export endpoint will reject this user.
 * The existing PASSWORD_VAULT_KEY remains available for other v1 users.
 */
export const finalizeVaultMigration = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "vault_version", "migration_status"],
  });
  if (!user) fail("User not found", 404);

  // Idempotent: if already v2 treat as success.
  if (user.vault_version === "v2") {
    return { vault_version: "v2", migrated_count: 0, already_completed: true };
  }
  if (user.migration_status !== "in_progress") {
    fail("Migration is not in progress for this user", 403);
  }

  // Verify every entry is now in v2 format.
  const entries = await PasswordEntry.findAll({
    where: { user_id: userId },
    attributes: ["id", "key_"],
  });
  const remainingV1 = entries.filter((e) => isV1Format(e.key_));
  if (remainingV1.length > 0) {
    fail(
      `${remainingV1.length} entries still have v1-format ciphertext. ` +
        "Upload all migrated entries before finalizing.",
      400,
    );
  }

  // Phase 8: Verify recovery key metadata was stored
  const vaultKey = await UserVaultKey.findOne({ where: { user_id: userId } });
  if (!vaultKey || !vaultKey.recovery_wrapped_dek) {
    fail(
      "Recovery key metadata must be generated and stored before finalizing migration.",
      400,
    );
  }

  // All clear — flip to v2.
  await user.update({ vault_version: "v2", migration_status: "completed" });
  return { vault_version: "v2", migrated_count: entries.length, already_completed: false };
};
