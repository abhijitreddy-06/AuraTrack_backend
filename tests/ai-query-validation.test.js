import test from "node:test";
import assert from "node:assert/strict";

import {
  validateAiQuery,
  buildUserScopedWhere,
  rejectForbiddenRequest,
} from "../src/ai/services/ai-query.service.js";

test("accepts structured samosa count query and injects user scope", () => {
  const query = validateAiQuery(
    {
      entity: "expenses",
      operation: "count",
      filters: {
        text_contains: "samosa",
        date_from: "2026-08-01",
        date_to: "2026-08-31",
      },
      limit: 20,
    },
    "user-123",
  );

  assert.equal(query.entity, "expenses");
  assert.equal(query.operation, "count");
  assert.equal(query.userId, "user-123");
  assert.equal(query.filters.text_contains, "samosa");
  assert.deepEqual(query.where.user_id, "user-123");
});

test("rejects forbidden user_id override", () => {
  assert.throws(() => {
    validateAiQuery(
      {
        entity: "expenses",
        operation: "sum",
        user_id: "attacker",
        filters: { amount_min: 10 },
      },
      "user-123",
    );
  }, /user_id/i);
});

test("rejects forbidden entity and raw SQL", () => {
  assert.throws(() => {
    validateAiQuery(
      {
        entity: "users",
        operation: "list",
      },
      "user-123",
    );
  }, /forbidden|not allowed/i);

  assert.throws(() => {
    validateAiQuery(
      {
        entity: "expenses",
        operation: "list",
        raw_sql: "SELECT * FROM users",
      },
      "user-123",
    );
  }, /raw sql|sql/i);
});

test("buildUserScopedWhere always includes authenticated user id", () => {
  const where = buildUserScopedWhere({ filter: "Samosa" }, "user-123");
  assert.equal(where.user_id, "user-123");
});

test("rejects forbidden operations", () => {
  assert.throws(() => {
    validateAiQuery(
      {
        entity: "expenses",
        operation: "delete",
      },
      "user-123",
    );
  }, /operation/i);
});

test("handles case-insensitive keyword search safely", () => {
  const query = validateAiQuery(
    {
      entity: "expenses",
      operation: "list",
      filters: {
        text_contains: "TIRUPATI",
        title_contains: "tirupati",
      },
      limit: 5,
    },
    "user-123",
  );

  assert.equal(query.filters.text_contains, "TIRUPATI");
  assert.ok(query.where);
});

test("rejects dangerous fields and unsupported note operations", () => {
  assert.throws(() => {
    validateAiQuery(
      {
        entity: "notes",
        operation: "update",
        fields: ["text", "password"],
      },
      "user-123",
    );
  }, /field|operation/i);
});

test("rejects request size beyond limits", () => {
  const bigPayload = {
    entity: "expenses",
    operation: "list",
    filters: {
      text_contains: "x".repeat(20000),
    },
  };

  assert.throws(() => {
    validateAiQuery(bigPayload, "user-123");
  }, /too large|request/i);
});

test("rate-limiter guard blocks repeated requests", () => {
  const violation = rejectForbiddenRequest({
    key: "user-123",
    currentWindowCount: 20,
  });

  assert.ok(violation);
});
