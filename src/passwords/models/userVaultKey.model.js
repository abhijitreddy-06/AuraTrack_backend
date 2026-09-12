import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

/**
 * UserVaultKey stores the per-user cryptographic metadata needed for
 * client-side vault encryption (vault_version = 'v2').
 *
 * ALL values here are non-secret metadata — the server cannot derive the
 * vault encryption key from these fields alone (Argon2id requires the
 * user's plaintext password, which never leaves the client).
 *
 * Columns:
 *   kdf_salt        — Argon2id salt (base64url, 32 bytes). Random per user.
 *                     Non-secret; safe to store and transmit.
 *   kdf_params      — JSON object recording the Argon2id cost parameters
 *                     used when kdf_salt was generated. Stored so that:
 *                     (a) clients can reproduce the exact key derivation, and
 *                     (b) future cost upgrades can be detected and re-keyed.
 *                     Shape: { opslimit: number, memlimit: number, algo: number }
 *   wrapped_dek     — Reserved for Phase 2: base64url-encoded encrypted DEK
 *                     (Data Encryption Key). NULL until a separate DEK
 *                     architecture is introduced.
 *   wrapped_dek_nonce — Reserved for Phase 2: base64url nonce used to wrap
 *                       the DEK. NULL until Phase 2.
 *
 * In Phase 1 this row is created (with wrapped_dek / wrapped_dek_nonce = NULL)
 * when a user opts into v2 encryption. In the current Phase 1 scope it exists
 * as the authoritative schema anchor — no application code reads or writes it yet.
 */
export const UserVaultKey = sequelize.define(
  "UserVaultKey",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // one vault-key record per user
      references: { model: "Users", key: "id" },
    },

    /**
     * Argon2id salt — base64url encoded, 32 bytes.
     * Generated client-side via libsodium randombytes_buf(32).
     * Non-secret; must be stored and returned to the client on login
     * so it can re-derive the vault key.
     */
    kdf_salt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    /**
     * JSON blob recording the Argon2id cost parameters at the time
     * kdf_salt was generated.
     * Example: { "opslimit": 2, "memlimit": 67108864, "algo": 2 }
     *   opslimit — crypto_pwhash_OPSLIMIT_INTERACTIVE (default: 2)
     *   memlimit — crypto_pwhash_MEMLIMIT_INTERACTIVE (default: 64 MB)
     *   algo     — crypto_pwhash_ALG_ARGON2ID13 (= 2)
     *
     * Stored as JSONB for efficient querying; returned verbatim to clients.
     */
    kdf_params: {
      type: DataTypes.JSONB,
      allowNull: false,
    },

    /**
     * Phase 2 placeholder: base64url-encoded encrypted Data Encryption Key.
     * NULL in Phase 1. Will hold the DEK encrypted with the vault key so
     * that key rotation doesn't require re-encrypting all vault entries.
     */
    wrapped_dek: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    /**
     * Phase 2 placeholder: base64url nonce for the wrapped_dek encryption.
     * NULL in Phase 1.
     */
    wrapped_dek_nonce: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    /**
     * Phase 8: Recovery key metadata.
     * The recovery key is an emergency backup credential that can unwrap the DEK.
     * The server stores only non-secret salt, KDF parameters, wrapped DEK, and nonce.
     * The plaintext recovery key and recovery KEK are NEVER sent to or stored by the server.
     */
    recovery_kdf_salt: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    recovery_kdf_params: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },

    recovery_wrapped_dek: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    recovery_wrapped_dek_nonce: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_vault_keys",
    timestamps: false, // managed manually via created_at / updated_at above
  },
);

UserVaultKey.belongsTo(User, { foreignKey: "user_id", as: "user" });
