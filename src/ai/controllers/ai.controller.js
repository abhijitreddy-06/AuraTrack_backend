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

export const executeAiStructuredQuery = async (query) => {
  const model = MODEL_MAP[query.entity];

  if (!model) {
    throw Object.assign(new Error("Forbidden AI entity"), {
      statusCode: 403,
    });
  }

  const options = {
    where: query.where,
    attributes: query.fields,
    limit: query.limit,
    order: [
      ["date", "DESC"],
      ["created_at", "DESC"],
    ],
  };

  if (["sum", "avg", "min", "max", "count"].includes(query.operation)) {
    const aggregateField = query.aggregate_field || query.field || "amount";
    const aggregate =
      query.operation === "count"
        ? await model.count({ where: query.where })
        : await model.aggregate(query.operation, {
            attribute: aggregateField,
            where: query.where,
            plain: false,
          });

    return {
      operation: query.operation,
      entity: query.entity,
      field: aggregateField,
      value:
        query.operation === "count"
          ? aggregate
          : Number(aggregate?.[0]?.[query.operation] ?? aggregate),
    };
  }

  if (query.operation === "aggregate") {
    const aggregateFunction = String(query.aggregate || "sum").toLowerCase();
    const aggregateField = query.aggregate_field || query.field || "amount";
    const result = await model.aggregate(aggregateFunction, {
      attribute: aggregateField,
      where: query.where,
      plain: false,
    });
    return {
      operation: aggregateFunction,
      field: aggregateField,
      value: Number(result?.[0]?.[aggregateFunction] ?? result),
    };
  }

  if (query.operation === "summary") {
    const rows = await model.findAll({
      where: query.where,
      attributes: query.fields,
      limit: query.limit,
    });
    return toSafeResponse(rows, query.fields);
  }

  if (query.operation === "trend") {
    const rows = await model.findAll({
      where: query.where,
      attributes: query.fields,
      limit: query.limit,
    });
    return toSafeResponse(rows, query.fields);
  }

  const rows = await model.findAll(options);
  return {
    records: toSafeResponse(rows, query.fields),
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
