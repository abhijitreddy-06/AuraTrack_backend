import { Op } from "sequelize";

const ALLOWED_ENTITIES = {
  expenses: {
    model: "Expense",
    fields: ["id", "title", "amount", "date", "time", "created_at"],
    textFields: ["title"],
  },
  incomes: {
    model: "Income",
    fields: ["id", "title", "amount", "date", "time", "created_at"],
    textFields: ["title"],
  },
  notes: {
    model: "Note",
    fields: ["id", "text", "created_at"],
    textFields: ["text"],
  },
  todos: {
    model: "Todo",
    fields: ["id", "title", "start_time", "end_time", "date", "completed"],
    textFields: ["title"],
  },
  birthdays: {
    model: "Birthday",
    fields: ["id", "name", "date", "created_at"],
    textFields: ["name"],
  },
  habits: {
    model: "Habit",
    fields: [
      "id",
      "title",
      "current_streak",
      "longest_streak",
      "missed_count",
      "today_done",
      "last_completed_date",
      "last_processed_date",
      "created_at",
    ],
    textFields: ["title"],
  },
  habit_completions: {
    model: "HabitCompletion",
    fields: ["id", "habit_id", "completed_date"],
    textFields: [],
  },
  borrowed: {
    model: "Borrowed",
    fields: ["id", "person_name", "amount", "date", "time", "created_at"],
    textFields: ["person_name"],
  },
  lended: {
    model: "Lended",
    fields: ["id", "person_name", "amount", "date", "time", "created_at"],
    textFields: ["person_name"],
  },
  planned_expenses: {
    model: "PlannedExpense",
    fields: ["id", "title", "amount", "date", "time"],
    textFields: ["title"],
  },
};

const ALLOWED_OPERATIONS = new Set([
  "list",
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "aggregate",
  "summary",
  "trend",
]);
const ALLOWED_AGGREGATIONS = new Set(["sum", "avg", "min", "max", "count"]);
const MAX_REQUEST_BYTES = 20000;
const MAX_LIMIT = 20;
const MAX_DATE_RANGE_DAYS = 3660;
const USERS = new Set(["users", "user"]);
const SENSITIVE_TABLES = new Set([
  "refresh_tokens",
  "passwords",
  "push_tokens",
  "notification_logs",
  "documents",
  "firebase",
  "secrets",
]);

const sanitizeString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 255);
};

const validateRequestSize = (payload) => {
  const size = JSON.stringify(payload).length;
  if (size > MAX_REQUEST_BYTES) {
    const error = new Error("AI request too large");
    error.statusCode = 413;
    throw error;
  }
};

const ensureNotForbiddenEntity = (entity) => {
  if (!entity || typeof entity !== "string") {
    throw Object.assign(new Error("AI entity is required"), {
      statusCode: 400,
    });
  }

  if (
    USERS.has(entity) ||
    SENSITIVE_TABLES.has(entity) ||
    !(entity in ALLOWED_ENTITIES)
  ) {
    const error = new Error(`Forbidden AI entity: ${entity}`);
    error.statusCode = 403;
    throw error;
  }
};

const ensureNotRawSql = (payload) => {
  const forbiddenKeys = ["raw_sql", "query", "sql", "statement"];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const error = new Error("Raw SQL is not allowed in AI queries");
      error.statusCode = 400;
      throw error;
    }
  }

  if (typeof payload?.filters === "object" && payload.filters) {
    for (const [key, value] of Object.entries(payload.filters)) {
      if (
        typeof value === "string" &&
        /\b(select|insert|update|delete|drop|alter|truncate|union|join|;|--)/i.test(
          value,
        )
      ) {
        const error = new Error("Raw SQL or unsafe value detected in AI query");
        error.statusCode = 400;
        throw error;
      }
    }
  }
};

const ensureAllowedFields = (entity, fields) => {
  const allowed = ALLOWED_ENTITIES[entity].fields;
  for (const field of fields || []) {
    if (!allowed.includes(field)) {
      const error = new Error(`Forbidden field for ${entity}: ${field}`);
      error.statusCode = 403;
      throw error;
    }
  }
};

export const buildUserScopedWhere = (filters = {}, userId) => {
  if (!userId) {
    const error = new Error("Authenticated user required");
    error.statusCode = 401;
    throw error;
  }

  const safeFilters = filters && typeof filters === "object" ? filters : {};
  const where = { user_id: userId };

  const allowedFilterMap = {
    text_contains: "text",
    title_contains: "title",
    description_contains: "description",
    person_name: "person_name",
    category: "category",
    amount_min: "amount",
    amount_max: "amount",
    date_from: "date",
    date_to: "date",
    completed: "completed",
  };

  for (const [key, value] of Object.entries(safeFilters)) {
    if (key === "user_id") {
      const error = new Error("user_id cannot be supplied by client");
      error.statusCode = 403;
      throw error;
    }

    if (!Object.prototype.hasOwnProperty.call(allowedFilterMap, key)) {
      continue;
    }

    if (value === undefined || value === null || value === "") {
      continue;
    }

    switch (key) {
      case "text_contains":
      case "title_contains":
      case "description_contains":
      case "person_name":
      case "category": {
        const cleaned = sanitizeString(value);
        if (!cleaned) continue;
        where[allowedFilterMap[key]] = { [Op.iLike]: `%${cleaned}%` };
        break;
      }
      case "amount_min": {
        const num = Number(value);
        if (Number.isFinite(num))
          where.amount = { ...where.amount, [Op.gte]: num };
        break;
      }
      case "amount_max": {
        const num = Number(value);
        if (Number.isFinite(num))
          where.amount = { ...where.amount, [Op.lte]: num };
        break;
      }
      case "date_from": {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          where.date = {
            ...where.date,
            [Op.gte]: date.toISOString().slice(0, 10),
          };
        }
        break;
      }
      case "date_to": {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          where.date = {
            ...where.date,
            [Op.lte]: date.toISOString().slice(0, 10),
          };
        }
        break;
      }
      case "completed": {
        if (value === true || value === false) {
          where.completed = value;
        }
        break;
      }
      default:
        break;
    }
  }

  return where;
};

export const validateAiQuery = (payload, userId) => {
  if (!payload || typeof payload !== "object") {
    throw Object.assign(new Error("Invalid AI request payload"), {
      statusCode: 400,
    });
  }

  validateRequestSize(payload);
  ensureNotRawSql(payload);

  if (Object.prototype.hasOwnProperty.call(payload, "user_id")) {
    throw Object.assign(new Error("user_id cannot be supplied by client"), {
      statusCode: 403,
    });
  }

  const entity = payload.entity;
  ensureNotForbiddenEntity(entity);

  const operation = String(payload.operation || "list").toLowerCase();
  if (!ALLOWED_OPERATIONS.has(operation)) {
    const error = new Error(`Unsupported AI operation: ${operation}`);
    error.statusCode = 400;
    throw error;
  }

  if (["sum", "avg", "min", "max", "count"].includes(operation)) {
    const aggregateField = payload.aggregate_field || payload.field || "amount";
    if (!ALLOWED_ENTITIES[entity].fields.includes(aggregateField)) {
      const error = new Error(
        `Forbidden aggregate field for ${entity}: ${aggregateField}`,
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const limit = Math.min(Number(payload.limit ?? 20) || 20, MAX_LIMIT);
  const fields = Array.isArray(payload.fields) ? payload.fields : [];
  ensureAllowedFields(entity, fields);

  const filters =
    payload.filters && typeof payload.filters === "object"
      ? payload.filters
      : {};
  const where = buildUserScopedWhere(filters, userId);

  const hasDateRange = !!filters.date_from || !!filters.date_to;

  if (hasDateRange) {
    const start = filters.date_from ? new Date(filters.date_from) : new Date();
    const end = filters.date_to ? new Date(filters.date_to) : new Date();
    const diffDays = Math.abs((end - start) / 86400000);
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      const error = new Error(
        "AI date range exceeds the maximum allowed window",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const aggregate = payload.aggregate || null;
  if (aggregate) {
    const agg = String(aggregate).toLowerCase();
    if (!ALLOWED_AGGREGATIONS.has(agg)) {
      const error = new Error(`Unsupported aggregate function: ${aggregate}`);
      error.statusCode = 400;
      throw error;
    }
  }

  const response = {
    entity,
    operation,
    userId,
    fields: fields.length ? fields : ALLOWED_ENTITIES[entity].fields,
    limit,
    filters,
    where,
    aggregate,
  };

  return response;
};

export const rejectForbiddenRequest = ({ key, currentWindowCount }) => {
  if (currentWindowCount >= 20) {
    return {
      allowed: false,
      reason: "AI request rate limit exceeded. Please wait before retrying.",
    };
  }
  return null;
};

export const validateAiOperation = (payload) => {
  if (
    payload?.operation &&
    !ALLOWED_OPERATIONS.has(String(payload.operation).toLowerCase())
  ) {
    throw Object.assign(new Error("Unsupported AI operation"), {
      statusCode: 400,
    });
  }
};
