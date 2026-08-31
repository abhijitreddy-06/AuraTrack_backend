import { PlannedExpense } from "../models/plannedExpense.model.js";

const fail = (message, statusCode) => {
  return Object.assign(new Error(message), { statusCode });
};

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const date = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw fail("A valid planned expense date (YYYY-MM-DD) is required", 400);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw fail("A valid planned expense date (YYYY-MM-DD) is required", 400);
  }

  return value;
};

const time = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
  ) {
    throw fail("Time must use HH:MM format", 400);
  }

  return value.slice(0, 5);
};

const values = (data, partial = false) => {
  const entry = {};

  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw fail("Planned expense title is required", 400);
    }

    if (data.title.trim().length > 200) {
      throw fail("Planned expense title must be 200 characters or fewer", 400);
    }

    entry.title = data.title.trim();
  }

  if (!partial || data.amount !== undefined) {
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw fail("Planned expense amount must be a positive whole number", 400);
    }
    entry.amount = data.amount;
  }

  if (!partial || data.date !== undefined) {
    entry.date = date(data.date);
  }

  if (!partial || data.time !== undefined) {
    entry.time = time(data.time);
  }

  if (partial && !Object.keys(entry).length) {
    throw fail("Provide planned expense fields to update", 400);
  }
  return entry;
};

const id = (value) => {
  if (typeof value !== "string" || !uuid.test(value))
    throw fail("Invalid planned expense ID", 400);
};

export const getPlannedExpenses = (userId) =>
  PlannedExpense.findAll({
    where: { user_id: userId },
    order: [
      ["date", "ASC"],
      ["time", "ASC"],
      ["title", "ASC"],
    ],
  });

export const createPlannedExpense = (userId, data) =>
  PlannedExpense.create({ user_id: userId, ...values(data) });

export const updatePlannedExpense = async (userId, entryId, data) => {
  id(entryId);

  const entry = await PlannedExpense.findOne({
    where: { id: entryId, user_id: userId },
  });

  if (!entry) {
    throw fail("Planned expense not found", 404);
  }

  await entry.update(values(data, true));

  return entry;
};

export const deletePlannedExpense = async (userId, entryId) => {
  id(entryId);

  const entry = await PlannedExpense.findOne({
    where: { id: entryId, user_id: userId },
  });

  if (!entry) {
    throw fail("Planned expense not found", 404);
  }

  await entry.destroy();
};
