import { Birthday } from "../models/birthday.model.js";
import { getISTDate, isValidDateOnly } from "../../utils/ist.js";

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError("A valid birthday date (YYYY-MM-DD) is required", 400);
  }

  if (!isValidDateOnly(value)) {
    throw createError("A valid birthday date (YYYY-MM-DD) is required", 400);
  }

  const today = getISTDate();
  if (value > today) {
    throw createError("Birthday cannot be in the future", 400);
  }

  return value;
};

const validateBirthday = ({ name, date }, { partial = false } = {}) => {
  const birthday = {};

  if (!partial || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw createError("Birthday name is required", 400);
    }

    if (name.trim().length > 100) {
      throw createError("Birthday name must be 100 characters or fewer", 400);
    }

    birthday.name = name.trim();
  }

  if (!partial || date !== undefined) {
    birthday.date = normalizeDate(date);
  }

  if (partial && Object.keys(birthday).length === 0) {
    throw createError("Provide a name or date to update", 400);
  }

  return birthday;
};

const validateBirthdayId = (birthdayId) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof birthdayId !== "string" || !uuidPattern.test(birthdayId)) {
    throw createError("Invalid birthday ID", 400);
  }
};

export const getBirthdays = async (userId) =>
  Birthday.findAll({
    where: { user_id: userId },
    order: [
      ["date", "ASC"],
      ["name", "ASC"],
    ],
  });

export const createBirthday = async (userId, data) => {
  const birthday = validateBirthday(data);

  return Birthday.create({
    user_id: userId,
    ...birthday,
  });
};

export const updateBirthday = async (userId, birthdayId, data) => {
  validateBirthdayId(birthdayId);

  const birthday = await Birthday.findOne({
    where: { id: birthdayId, user_id: userId },
  });

  if (!birthday) {
    throw createError("Birthday not found", 404);
  }

  await birthday.update(validateBirthday(data, { partial: true }));
  return birthday;
};

export const deleteBirthday = async (userId, birthdayId) => {
  validateBirthdayId(birthdayId);

  const birthday = await Birthday.findOne({
    where: { id: birthdayId, user_id: userId },
  });

  if (!birthday) {
    throw createError("Birthday not found", 404);
  }

  await birthday.destroy();
};
