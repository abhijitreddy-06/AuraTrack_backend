import { Income } from "../models/income.model.js";

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw createError("A valid income date (YYYY-MM-DD) is required", 400);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw createError("A valid income date (YYYY-MM-DD) is required", 400);
  return value;
};

const validateTime = (value) => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw createError("A valid income time (HH:MM) is required", 400);
  return value.slice(0, 5);
};

const validateIncome = (data, partial = false) => {
  const income = {};
  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) throw createError("Income title is required", 400);
    if (data.title.trim().length > 200) throw createError("Income title must be 200 characters or fewer", 400);
    income.title = data.title.trim();
  }
  if (!partial || data.amount !== undefined) {
    if (!Number.isInteger(data.amount) || data.amount <= 0) throw createError("Income amount must be a positive whole number", 400);
    income.amount = data.amount;
  }
  if (!partial || data.date !== undefined) income.date = validateDate(data.date);
  if (!partial || data.time !== undefined) income.time = validateTime(data.time);
  if (partial && !Object.keys(income).length) throw createError("Provide income fields to update", 400);
  return income;
};

const validateId = (id) => {
  if (typeof id !== "string" || !uuidPattern.test(id)) throw createError("Invalid income ID", 400);
};

export const getIncomes = (userId) => Income.findAll({ where: { user_id: userId }, order: [["date", "DESC"], ["time", "DESC"], ["created_at", "DESC"]] });
export const createIncome = (userId, data) => Income.create({ user_id: userId, ...validateIncome(data) });
export const updateIncome = async (userId, id, data) => {
  validateId(id);
  const income = await Income.findOne({ where: { id, user_id: userId } });
  if (!income) throw createError("Income not found", 404);
  await income.update(validateIncome(data, true));
  return income;
};
export const deleteIncome = async (userId, id) => {
  validateId(id);
  const income = await Income.findOne({ where: { id, user_id: userId } });
  if (!income) throw createError("Income not found", 404);
  await income.destroy();
};
