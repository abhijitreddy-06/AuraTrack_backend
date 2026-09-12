import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    theme_preference: {
      type: DataTypes.ENUM("light", "dark"),
      allowNull: false,
      defaultValue: "light",
    },

    app_lock_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    /**
     * vault_version tracks which encryption scheme protects this user's
     * password vault entries:
     *
     *   'v1' — legacy server-side AES-256-GCM (PASSWORD_VAULT_KEY env var).
     *           Default for all existing users. Server can decrypt entries.
     *
     *   'v2' — client-side XChaCha20-Poly1305 (Argon2id-derived key).
     *           Server stores opaque ciphertext and cannot decrypt entries.
     *           Requires a corresponding row in user_vault_keys.
     *
     * Running both values simultaneously allows a safe, gradual migration
     * without a big-bang cutover: v1 users keep working normally while
     * v2 users get zero-knowledge encryption. Migration path: re-encrypt
     * all entries client-side, upsert user_vault_keys, then flip to 'v2'.
     */
    vault_version: {
      type: DataTypes.ENUM("v1", "v2"),
      allowNull: false,
      defaultValue: "v2",
    },

    /**
     * migration_status tracks the Phase 6 v1 → v2 vault migration state.
     *
     *   'not_started' — user has not started migration (default).
     *   'in_progress' — migration initiated; DEK stored but vault_version still v1.
     *   'completed'   — all entries re-encrypted, vault_version flipped to v2.
     *
     * Stored as VARCHAR(20) to avoid Postgres ENUM type registration complexity.
     * Values are validated by a CHECK constraint added in migrate-phase6-schema.js.
     */
    migration_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "not_started",
      validate: {
        isIn: [["not_started", "in_progress", "completed"]],
      },
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "Users",
    timestamps: false,
  },
);
