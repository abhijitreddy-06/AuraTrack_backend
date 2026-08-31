import cron from "node-cron";
import { Habit } from "../habits/models/habit.model.js";
import { Birthday } from "../birthdays/models/birthday.model.js";
import { deleteExpiredTodos } from "../todo/services/todo.service.js";
import { getISTDate, getISTTomorrow, IST_TIME_ZONE } from "../utils/ist.js";
import { sendReminderOnce } from "./notification.service.js";

let schedulerStarted = false;

export const runHabitReminderJob = async () => {
  const today = getISTDate();
  try {
    const habits = await Habit.findAll({ attributes: ["user_id", "last_completed_date"] });
    const userIds = [...new Set(habits.filter((habit) => habit.last_completed_date !== today).map((habit) => habit.user_id))];
    await Promise.allSettled(userIds.map((userId) => sendReminderOnce({
      userId,
      type: "habit_reminder",
      reminderDate: today,
      title: "Don't forget your habit! 🔥",
      body: "You haven't completed your habit today. Take a moment to finish it.",
    })));
  } catch (error) { console.error("Habit reminder job failed:", error); }
};

export const runBirthdayReminderJob = async () => {
  const tomorrow = getISTTomorrow();
  try {
    const birthdays = await Birthday.findAll({ attributes: ["user_id", "name", "date"] });
    const namesByUser = new Map();
    birthdays.filter((birthday) => birthday.date.slice(5) === tomorrow.slice(5)).forEach((birthday) => {
      namesByUser.set(birthday.user_id, [...(namesByUser.get(birthday.user_id) || []), birthday.name]);
    });
    await Promise.allSettled([...namesByUser.entries()].map(([userId, names]) => {
      const people = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
      return sendReminderOnce({
        userId,
        type: "birthday_reminder",
        reminderDate: tomorrow,
        title: "Birthday Tomorrow 🎂",
        body: `Tomorrow is ${people}'s birthday. Don't forget to wish them!`,
      });
    }));
  } catch (error) { console.error("Birthday reminder job failed:", error); }
};

export const runTodoCleanupJob = async () => {
  try { await deleteExpiredTodos(); } catch (error) { console.error("IST todo cleanup job failed:", error); }
};

export const startNotificationScheduler = () => {
  if (schedulerStarted) return;
  schedulerStarted = true;
  cron.schedule("0 22 * * *", () => void runHabitReminderJob(), { timezone: IST_TIME_ZONE });
  cron.schedule("0 23 * * *", () => void runBirthdayReminderJob(), { timezone: IST_TIME_ZONE });
  cron.schedule("0 0 * * *", () => void runTodoCleanupJob(), { timezone: IST_TIME_ZONE });
  console.log(`IST notification scheduler started (${IST_TIME_ZONE})`);
};
