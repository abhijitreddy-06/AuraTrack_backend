import "dotenv/config";
import sequelize from "../src/config/database.js";
import {
  runBirthdayReminderJob,
  runHabitReminderJob,
  runPushReceiptCheckJob,
  runTodoCleanupJob,
} from "../src/notifications/notification.scheduler.js";

const jobs = {
  habits: runHabitReminderJob,
  birthdays: runBirthdayReminderJob,
  todos: runTodoCleanupJob,
  receipts: runPushReceiptCheckJob,
};
const job = jobs[process.argv[2]];

if (!job) {
  console.error("Unknown notification job");
  process.exitCode = 1;
} else {
  try {
    await sequelize.authenticate();
    await job();
  } catch (error) {
    console.error("Scheduled notification job failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
