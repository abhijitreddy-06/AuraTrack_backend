// backend/scripts/verify-v2-vault-safety.js
// Permanent Phase 9 database safety verification script.
// Verifies that 100% of users are on vault_version = 'v2' and have valid
// required cryptographic metadata in user_vault_keys.
//
// Read-only: Does NOT mutate, delete, or regenerate any data.
// Exits with code 0 on success, code 1 on failure.

import sequelize from "../src/config/database.js";

const runSafetyCheck = async () => {
  try {
    console.log("=================================================");
    console.log(" AuraTrack Phase 9: Vault v2 Safety Verification ");
    console.log("=================================================");

    await sequelize.authenticate();
    console.log("[INFO] Database connected successfully.\n");

    // 1. Check for any users that are NOT 'v2', NULL, or unexpected
    const [invalidVersionUsers] = await sequelize.query(`
      SELECT id, vault_version
      FROM "Users"
      WHERE vault_version IS NULL OR vault_version != 'v2';
    `);

    // 2. Count total users
    const [userCountResult] = await sequelize.query(`
      SELECT count(*)::int AS total FROM "Users";
    `);
    const totalUsers = userCountResult[0]?.total ?? 0;

    // 3. Check for v2 users who have initialized vault keys and verify metadata completeness
    const [v2KeyIntegrity] = await sequelize.query(`
      SELECT 
        u.id AS user_id,
        u.vault_version,
        uvk.id AS vault_key_id,
        uvk.kdf_salt,
        uvk.kdf_params,
        uvk.wrapped_dek,
        uvk.wrapped_dek_nonce,
        uvk.recovery_kdf_salt,
        uvk.recovery_kdf_params,
        uvk.recovery_wrapped_dek,
        uvk.recovery_wrapped_dek_nonce
      FROM "Users" u
      LEFT JOIN "user_vault_keys" uvk ON uvk.user_id = u.id
      WHERE u.vault_version = 'v2';
    `);

    let hasFailures = false;
    const failureReasons = [];

    // Check 1: Non-v2 users
    if (invalidVersionUsers.length > 0) {
      hasFailures = true;
      failureReasons.push(
        `Found ${invalidVersionUsers.length} user(s) with vault_version != 'v2' or NULL.`,
      );
      console.error(
        `[FAIL] Found ${invalidVersionUsers.length} user(s) not on v2:`,
      );
      invalidVersionUsers.forEach((u) => {
        console.error(
          `  - User ID: ${u.id}, vault_version: ${u.vault_version}`,
        );
      });
      console.error("");
    } else {
      console.log(
        `[PASS] All ${totalUsers} user(s) have vault_version = 'v2'.`,
      );
    }

    // Check 2: Cryptographic metadata for initialized vaults
    // For users with existing passwords, their vault MUST have a complete user_vault_keys record.
    const [entriesPerUser] = await sequelize.query(`
      SELECT user_id, count(*)::int AS entry_count
      FROM "passwords"
      GROUP BY user_id;
    `);
    const entryCountMap = new Map();
    entriesPerUser.forEach((row) =>
      entryCountMap.set(row.user_id, row.entry_count),
    );

    let incompleteVaultCount = 0;
    v2KeyIntegrity.forEach((row) => {
      const passwordCount = entryCountMap.get(row.user_id) || 0;
      // If the user has saved passwords, or has initialized a vault key row:
      if (row.vault_key_id || passwordCount > 0) {
        const missingFields = [];
        if (!row.kdf_salt) missingFields.push("kdf_salt");
        if (!row.kdf_params) missingFields.push("kdf_params");
        if (!row.wrapped_dek) missingFields.push("wrapped_dek");
        if (!row.wrapped_dek_nonce) missingFields.push("wrapped_dek_nonce");
        if (!row.recovery_kdf_salt) missingFields.push("recovery_kdf_salt");
        if (!row.recovery_kdf_params) missingFields.push("recovery_kdf_params");
        if (!row.recovery_wrapped_dek)
          missingFields.push("recovery_wrapped_dek");
        if (!row.recovery_wrapped_dek_nonce)
          missingFields.push("recovery_wrapped_dek_nonce");

        if (missingFields.length > 0) {
          incompleteVaultCount++;
          console.error(
            `[FAIL] User ID ${row.user_id} has incomplete v2 cryptographic metadata (missing: ${missingFields.join(", ")}) [password_entries: ${passwordCount}]`,
          );
        }
      }
    });

    if (incompleteVaultCount > 0) {
      hasFailures = true;
      failureReasons.push(
        `Found ${incompleteVaultCount} user(s) with missing/inconsistent v2 cryptographic metadata.`,
      );
    } else {
      console.log(
        `[PASS] All initialized v2 vaults have complete cryptographic metadata (salt, params, wrapped_dek, recovery keys).`,
      );
    }

    console.log("\n-------------------------------------------------");
    console.log(`Total Users Audited: ${totalUsers}`);
    console.log(`Legacy v1 Users:     ${invalidVersionUsers.length}`);
    console.log(`Incomplete Metadata: ${incompleteVaultCount}`);
    console.log("-------------------------------------------------");

    if (hasFailures) {
      console.error("\n[FATAL] Safety verification failed!");
      failureReasons.forEach((r) => console.error(`  - ${r}`));
      process.exit(1);
    } else {
      console.log(
        "\n[SUCCESS] Verification passed: 100% v2 compliance. Zero legacy users.",
      );
      process.exit(0);
    }
  } catch (error) {
    console.error(
      "[FATAL] Safety verification encountered an unexpected error:",
      error,
    );
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

runSafetyCheck();
