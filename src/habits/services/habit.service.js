import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";
import { Habit, HabitCompletion } from "../models/habit.model.js";
import { addISTDays, getISTDate } from "../../utils/ist.js";

const getToday = getISTDate;
const addDays = addISTDays;

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getHabits = async (userId) => {
  const today = getToday();
  const habits = await Habit.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
  });

  for (const habit of habits) {
    if (!habit.last_processed_date) {
      await habit.update({
        last_processed_date: today,
        today_done: habit.last_completed_date === today,
      });
      continue;
    }

    if (habit.last_processed_date === today) {
      habit.today_done = habit.last_completed_date === today;
      continue;
    }

    let processDate = addDays(habit.last_processed_date, 1);

    while (processDate < today) {
      const completion = await HabitCompletion.findOne({
        where: { habit_id: habit.id, completed_date: processDate },
      });

      if (!completion) {
        habit.missed_count += 1;
        habit.current_streak = 0;
      }

      habit.last_processed_date = processDate;
      
      processDate = addDays(processDate, 1);
    }

    habit.today_done = habit.last_completed_date === today;
    await habit.save();
  }

  return habits;
};

export const createHabit = async (userId, { title }) => {
  if (!title || !title.trim()) {
    throw createError("Habit title is required", 400);
  }

  const user = await User.findByPk(userId, { attributes: ["id"] });

  if (!user) {
    throw createError("Authenticated user was not found", 401);
  }

  return Habit.create({
    user_id: userId,
    title: title.trim(),
    current_streak: 0,
    longest_streak: 0,
    missed_count: 0,
    today_done: false,
    last_completed_date: null,
    last_processed_date: getToday(),
  });
};

export const completeHabit = async (userId, id) => {
  const transaction = await sequelize.transaction();
  try {
    const today = getToday();
    const habit = await Habit.findOne({
      where: { id, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!habit) {
      throw createError("Habit not found", 404);
    }

    if (habit.last_completed_date === today) {
      throw createError("Habit already completed today", 400);
    }

    const completedYesterday = await HabitCompletion.findOne({
      where: { habit_id: habit.id, completed_date: addDays(today, -1) },
      transaction,
    });

    const currentStreak = completedYesterday ? habit.current_streak + 1 : 1;

    await HabitCompletion.create(
      { habit_id: habit.id, completed_date: today },
      { transaction },
    );

    await habit.update(
      {
        current_streak: currentStreak,
        longest_streak: Math.max(currentStreak, habit.longest_streak),
        today_done: true,
        last_completed_date: today,
        last_processed_date: today,
      },
      { transaction },
    );

    await transaction.commit();

    return habit;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const updateHabit = async (userId, id, { title }) => {
  if (!title || !title.trim()) {
    throw createError("Habit title is required", 400);
  }

  const habit = await Habit.findOne({ where: { id, user_id: userId } });

  if (!habit) {
    throw createError("Habit not found", 404);
  }

  await habit.update({ title: title.trim() });

  return habit;
};

export const deleteHabit = async (userId, id) => {
  const habit = await Habit.findOne({ where: { id, user_id: userId } });

  if (!habit) {
    throw createError("Habit not found", 404);
  }

  await habit.destroy();
};
