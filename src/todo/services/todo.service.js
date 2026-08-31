import { Todo } from "../models/todo.model.js";
import { Op } from "sequelize";
import { getISTDate, getISTTime, getISTTomorrow, isValidDateOnly } from "../../utils/ist.js";

const createError = (message, statusCode) => {
  return Object.assign(new Error(message), { statusCode });
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError("A valid task date (YYYY-MM-DD) is required", 400);
  }

  if (!isValidDateOnly(value)) {
    throw createError("A valid task date (YYYY-MM-DD) is required", 400);
  }
  return value;
};

const validateTime = (value, label) => {
  if (value === undefined || value === null || value === "") return null;
  if (
    typeof value !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
  ) {
    throw createError(`${label} must use HH:MM format`, 400);
  }
  return value.slice(0, 5);
};

const validateTodayTime = (date, startTime, endTime) => {
  if (date !== getISTDate()) return;
  const currentTime = getISTTime();
  if (
    (startTime && startTime < currentTime) ||
    (endTime && endTime < currentTime)
  ) {
    throw createError(
      "Today's task time cannot be before the current time",
      400,
    );
  }
};

const validateTomorrowTimeWindow = (date, startTime, endTime) => {
  if (date !== getISTTomorrow()) return;
  if (startTime === "00:00" || endTime === "00:00") {
    throw createError("Tomorrow tasks must be between 00:01 and 23:59", 400);
  }
};

const validateTodo = (data, partial = false) => {
  const todo = {};

  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw createError("Task title is required", 400);
    }

    if (data.title.trim().length > 200) {
      throw createError("Task title must be 200 characters or fewer", 400);
    }

    todo.title = data.title.trim();
  }

  if (!partial || data.date !== undefined) {
    todo.date = validateDate(data.date);
  }

  if (!partial || data.start_time !== undefined) {
    todo.start_time = validateTime(data.start_time, "Start time");
  }

  if (!partial || data.end_time !== undefined) {
    todo.end_time = validateTime(data.end_time, "End time");
  }

  if (data.completed !== undefined) {
    if (typeof data.completed !== "boolean") {
      throw createError("Completed must be true or false", 400);
    }
    todo.completed = data.completed;
  }
  if (partial && !Object.keys(todo).length) {
    throw createError("Provide task fields to update", 400);
  }
  return todo;
};

const validateId = (id) => {
  if (typeof id !== "string" || !uuidPattern.test(id))
    throw createError("Invalid todo ID", 400);
};

export const deleteExpiredTodos = () =>
  Todo.destroy({ where: { date: { [Op.lt]: getISTDate() } } });

export const getTodos = async (userId) => {
  await deleteExpiredTodos();
  return Todo.findAll({
    where: { user_id: userId },
    order: [
      ["date", "ASC"],
      ["completed", "ASC"],
      ["start_time", "ASC"],
      ["title", "ASC"],
    ],
  });
};

export const createTodo = (userId, data) => {
  const values = validateTodo(data);
  if (
    values.start_time &&
    values.end_time &&
    values.start_time >= values.end_time
  ) {
    throw createError("Start time must be before end time", 400);
  }
  validateTodayTime(values.date, values.start_time, values.end_time);
  validateTomorrowTimeWindow(values.date, values.start_time, values.end_time);
  return Todo.create({ user_id: userId, ...values });
};

export const updateTodo = async (userId, id, data) => {
  validateId(id);

  const todo = await Todo.findOne({ where: { id, user_id: userId } });

  if (!todo) {
    throw createError("Todo not found", 404);
  }

  const values = validateTodo(data, true);

  const updated = {
    date: values.date ?? todo.date,
    start_time:
      values.start_time === undefined ? todo.start_time : values.start_time,
    end_time: values.end_time === undefined ? todo.end_time : values.end_time,
  };

  if (
    updated.start_time &&
    updated.end_time &&
    updated.start_time >= updated.end_time
  ) {
    throw createError("Start time must be before end time", 400);
  }

  validateTomorrowTimeWindow(
    updated.date,
    updated.start_time,
    updated.end_time,
  );

  await todo.update(values);

  return todo;
};

export const deleteTodo = async (userId, id) => {
  validateId(id);

  const todo = await Todo.findOne({ where: { id, user_id: userId } });

  if (!todo) {
    throw createError("Todo not found", 404);
  }

  await todo.destroy();
};
