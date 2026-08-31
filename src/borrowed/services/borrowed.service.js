import { Borrowed } from "../models/borrowed.model.js";

const createError = (message, statusCode) => {
  return Object.assign(new Error(message), { statusCode });
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError("A valid borrowed date (YYYY-MM-DD) is required", 400);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw createError("A valid borrowed date (YYYY-MM-DD) is required", 400);
  }

  return value;
};

const validateTime = (value) => {
  if (
    typeof value !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
  ) {
    throw createError("A valid borrowed time (HH:MM) is required", 400);
  }

  return value.slice(0, 5);
};

const validateBorrowed = (data, partial = false) => {
  const entry = {};
  if (!partial || data.person_name !== undefined) {
    if (typeof data.person_name !== "string" || !data.person_name.trim()) {
      throw createError("Person name is required", 400);
    }

    if (data.person_name.trim().length > 200) {
      throw createError("Person name must be 200 characters or fewer", 400);
    }

    entry.person_name = data.person_name.trim();
  }

  if (!partial || data.amount !== undefined) {
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw createError("Borrowed amount must be a positive whole number", 400);
    }
    entry.amount = data.amount;
  }

  if (!partial || data.date !== undefined) {
    entry.date = validateDate(data.date);
  }
  if (!partial || data.time !== undefined) {
    entry.time = validateTime(data.time);
  }
  if (partial && !Object.keys(entry).length) {
    throw createError("Provide borrowed fields to update", 400);
  }
  return entry;
};

const validateId = (id) => {
  if (typeof id !== "string" || !uuidPattern.test(id))
    throw createError("Invalid borrowed ID", 400);
};

export const getBorrowedEntries = (userId) =>
  Borrowed.findAll({
    where: { user_id: userId },
    order: [
      ["date", "DESC"],
      ["time", "DESC"],
      ["created_at", "DESC"],
    ],
  });

export const createBorrowedEntry = (userId, data) =>
  Borrowed.create({ user_id: userId, ...validateBorrowed(data) });

export const updateBorrowedEntry = async (userId, id, data) => {
  validateId(id);

  const entry = await Borrowed.findOne({ where: { id, user_id: userId } });

  if (!entry) {
    throw createError("Borrowed entry not found", 404);
  }

  await entry.update(validateBorrowed(data, true));
  return entry;
};

export const deleteBorrowedEntry = async (userId, id) => {
  validateId(id);

  const entry = await Borrowed.findOne({ where: { id, user_id: userId } });

  if (!entry) {
    throw createError("Borrowed entry not found", 404);
  }

  await entry.destroy();
};
