import { Expense } from "../models/expense.model.js";

const createError = (message, statusCode) => {
  Object.assign(new Error(message), { statusCode });
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError("A valid expense date (YYYY-MM-DD) is required", 400);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw createError("A valid expense date (YYYY-MM-DD) is required", 400);
  }

  return value;
};

const validateTime = (value) => {
  if (
    typeof value !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
  ) {
    throw createError("A valid expense time (HH:MM) is required", 400);
  }

  return value.slice(0, 5);
};

const validateExpense = (data, partial = false) => {
  const expense = {};

  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw createError("Expense title is required", 400);
    }
    if (data.title.trim().length > 200) {
      throw createError("Expense title must be 200 characters or fewer", 400);
    }
    expense.title = data.title.trim();
  }

  if (!partial || data.amount !== undefined) {
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw createError("Expense amount must be a positive whole number", 400);
    }
    expense.amount = data.amount;
  }

  if (!partial || data.date !== undefined)
    expense.date = validateDate(data.date);
  if (!partial || data.time !== undefined)
    expense.time = validateTime(data.time);

  if (partial && !Object.keys(expense).length) {
    throw createError("Provide expense fields to update", 400);
  }

  return expense;
};

const validateId = (id) => {
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    throw createError("Invalid expense ID", 400);
  }
};

export const getExpenses = (userId) =>
  Expense.findAll({
    where: { user_id: userId },
    order: [
      ["date", "DESC"],
      ["time", "DESC"],
      ["created_at", "DESC"],
    ],
  });

export const createExpense = (userId, data) =>
  Expense.create({ user_id: userId, ...validateExpense(data) });

export const updateExpense = async (userId, id, data) => {
  validateId(id);

  const expense = await Expense.findOne({ where: { id, user_id: userId } });

  if (!expense) {
    throw createError("Expense not found", 404);
  }

  await expense.update(validateExpense(data, true));

  return expense;
};

export const deleteExpense = async (userId, id) => {
  validateId(id);

  const expense = await Expense.findOne({ where: { id, user_id: userId } });

  if (!expense) {
    throw createError("Expense not found", 404);
  }

  await expense.destroy();
};
