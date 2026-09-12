// backend/scripts/migrate-phase8-schema.js
// Idempotent schema migration for Phase 8: adds recovery key metadata columns to user_vault_keys.

import sequelize from "../src/config/database.js";

const run = async () => {
  try {
    console.log("Running Phase 8 schema migration (recovery key metadata)...");

    await sequelize.query(`
      ALTER TABLE "user_vault_keys"
      ADD COLUMN IF NOT EXISTS recovery_kdf_salt TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS recovery_kdf_params JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS recovery_wrapped_dek TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS recovery_wrapped_dek_nonce TEXT DEFAULT NULL;
    `);

    console.log("✓ Added recovery columns to user_vault_keys table");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();

