import { validateAiQuery } from "../services/ai-query.service.js";
import {
  generateFinalAiAnswer,
  translateQuestionToStructuredQuery,
} from "../services/llm-query.service.js";
import { Expense } from "../../expenses/models/expense.model.js";
import { Income } from "../../incomes/models/income.model.js";
import { Note } from "../../notes/models/note.model.js";
import { Todo } from "../../todo/models/todo.model.js";
import { Birthday } from "../../birthdays/models/birthday.model.js";
import { Habit, HabitCompletion } from "../../habits/models/habit.model.js";
import { Borrowed } from "../../borrowed/models/borrowed.model.js";
import { Lended } from "../../lended/models/lended.model.js";
import { PlannedExpense } from "../../plannedexpenses/models/plannedExpense.model.js";

const MODEL_MAP = {
  expenses: Expense,
  incomes: Income,
  notes: Note,
  todos: Todo,
  birthdays: Birthday,
  habits: Habit,
  habit_completions: HabitCompletion,
  borrowed: Borrowed,
  lended: Lended,
  planned_expenses: PlannedExpense,
};

const toSafeResponse = (rows, fields) => {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const item = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(row, field)) {
        item[field] = row[field];
      }
    }
    return item;
  });
};

const normalizeWhereClause = (where = {}, model) => {
  const rawAttributes = model.rawAttributes || {};
  const normalized = {};

  let textColumn = null;
  if (rawAttributes.title) textColumn = "title";
  else if (rawAttributes.name) textColumn = "name";
  else if (rawAttributes.person_name) textColumn = "person_name";
  else if (rawAttributes.text) textColumn = "text";

  let dateColumn = null;
  if (rawAttributes.date) dateColumn = "date";
  else if (rawAttributes.completed_date) dateColumn = "completed_date";
  else if (rawAttributes.created_at) dateColumn = "created_at";

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined || value === null) continue;

    if (rawAttributes[key]) {
      normalized[key] = value;
      continue;
    }

    if (
      [
        "text",
        "title",
        "person_name",
        "name",
        "description",
        "category",
      ].includes(key)
    ) {
      if (key === "person_name" && rawAttributes.name) {
        normalized.name = value;
      } else if (key === "name" && rawAttributes.person_name) {
        normalized.person_name = value;
      } else if (textColumn) {
        normalized[textColumn] = value;
      }
      continue;
    }

    if (key === "date" && dateColumn) {
      normalized[dateColumn] = value;
      continue;
    }

    if (key === "user_id" && !rawAttributes.user_id) {
      continue;
    }
  }

  return normalized;
};

export const executeAiStructuredQuery = async (query) => {
  const model = MODEL_MAP[query.entity];

  if (!model) {
    throw Object.assign(new Error("Forbidden AI entity"), {
      statusCode: 403,
    });
  }

  const rawAttributes = model.rawAttributes || {};
  const normalizedWhere = normalizeWhereClause(query.where, model);

  const order = [];
  if (rawAttributes.date) {
    order.push(["date", "DESC"]);
  }
  if (rawAttributes.created_at) {
    order.push(["created_at", "DESC"]);
  }
  if (rawAttributes.completed_date) {
    order.push(["completed_date", "DESC"]);
  }

  const validAttributes =
    Array.isArray(query.fields) && query.fields.length > 0
      ? query.fields.filter((field) =>
          Object.prototype.hasOwnProperty.call(rawAttributes, field),
        )
      : Object.keys(rawAttributes);

  const options = {
    where: normalizedWhere,
    attributes: validAttributes,
    limit: query.limit,
    ...(order.length > 0 ? { order } : {}),
  };

  if (["sum", "avg", "min", "max", "count"].includes(query.operation)) {
    const aggregateField = query.aggregate_field || query.field || "amount";
    const aggregate =
      query.operation === "count"
        ? await model.count({ where: normalizedWhere })
        : await model.aggregate(aggregateField, query.operation, {
            where: normalizedWhere,
          });

    const parsedValue =
      aggregate === null || aggregate === undefined ? 0 : Number(aggregate);

    return {
      operation: query.operation,
      entity: query.entity,
      field: aggregateField,
      value: Number.isNaN(parsedValue) ? 0 : parsedValue,
    };
  }

  if (query.operation === "aggregate") {
    const aggregateFunction = String(query.aggregate || "sum").toLowerCase();
    const aggregateField = query.aggregate_field || query.field || "amount";
    const result = await model.aggregate(aggregateField, aggregateFunction, {
      where: normalizedWhere,
    });
    const parsedValue =
      result === null || result === undefined ? 0 : Number(result);
    return {
      operation: aggregateFunction,
      field: aggregateField,
      value: Number.isNaN(parsedValue) ? 0 : parsedValue,
    };
  }

  if (query.operation === "summary") {
    const rows = await model.findAll({
      where: normalizedWhere,
      attributes: validAttributes,
      limit: query.limit,
      ...(order.length > 0 ? { order } : {}),
    });
    return toSafeResponse(rows, validAttributes);
  }

  if (query.operation === "trend") {
    const rows = await model.findAll({
      where: normalizedWhere,
      attributes: validAttributes,
      limit: query.limit,
      ...(order.length > 0 ? { order } : {}),
    });
    return toSafeResponse(rows, validAttributes);
  }

  const rows = await model.findAll(options);
  return {
    records: toSafeResponse(rows, validAttributes),
    total: rows.length,
  };
};

export const askAi = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const hasStructuredQuery =
      payload &&
      typeof payload === "object" &&
      (payload.entity ||
        payload.operation ||
        payload.filters ||
        payload.aggregate);

    if (hasStructuredQuery && payload.entity) {
      const query = validateAiQuery(payload, req.user.id);
      const result = await executeAiStructuredQuery(query);
      return res.status(200).json({ success: true, data: result });
    }

    if (payload.question || typeof payload === "string") {
      const question = typeof payload === "string" ? payload : payload.question;
      const structuredQuery = await translateQuestionToStructuredQuery(
        question,
        req.user.id,
      );
      const result = await executeAiStructuredQuery(structuredQuery);
      const answer = await generateFinalAiAnswer(question, result);

      return res.status(200).json({
        success: true,
        data: {
          query: structuredQuery,
          result,
          answer,
        },
      });
    }

    throw Object.assign(
      new Error(
        "AI request must include a question or a valid structured query",
      ),
      {
        statusCode: 400,
      },
    );
  } catch (error) {
    const safeMessage =
      error?.statusCode === 429
        ? "AI rate limit exceeded. Max 20 requests per minute per user."
        : error?.statusCode === 503
          ? "AI service is temporarily unavailable."
          : error?.statusCode === 504
            ? "AI request timed out. Please try again."
            : error?.statusCode === 400 || error?.statusCode === 413
              ? "Invalid AI request."
              : error?.statusCode === 502
                ? "Aura's AI provider is unavailable. Check the OpenRouter API key and model configuration."
                : "AI request failed.";

    const clientError = new Error(safeMessage);
    clientError.statusCode = error?.statusCode || 500;
    next(clientError);
  }
};
