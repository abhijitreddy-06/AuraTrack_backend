import bcrypt from "bcrypt";
import { col, fn, where } from "sequelize";
import { User } from "../../auth/models/auth.model.js";
import { RefreshToken } from "../../auth/models/refreshToken.model.js";
import { Birthday } from "../../birthdays/models/birthday.model.js";
import { Borrowed } from "../../borrowed/models/borrowed.model.js";
import { Expense } from "../../expenses/models/expense.model.js";
import { Habit } from "../../habits/models/habit.model.js";
import { Income } from "../../incomes/models/income.model.js";
import { Lended } from "../../lended/models/lended.model.js";
import { Note } from "../../notes/models/note.model.js";
import { PasswordEntry } from "../../passwords/models/password.model.js";
import { PlannedExpense } from "../../plannedexpenses/models/plannedExpense.model.js";
import { Todo } from "../../todo/models/todo.model.js";
import { NotificationLog } from "../../notifications/models/notificationLog.model.js";
import { PushToken } from "../../notifications/models/pushToken.model.js";

const BCRYPT_SALT_ROUNDS = 12;
const ALLOWED_THEMES = ["light", "dark"];

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const getSettings = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: [
      "id",
      "fullname",
      "email",
      "theme_preference",
      "app_lock_enabled",
    ],
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateTheme = async (userId, themePreference) => {
  if (!ALLOWED_THEMES.includes(themePreference)) {
    throw validationError("Theme preference must be light or dark");
  }

  await User.update(
    { theme_preference: themePreference },
    { where: { id: userId } },
  );

  return themePreference;
};

export const updateAppLock = async (userId, appLockEnabled) => {
  if (typeof appLockEnabled !== "boolean") {
    throw validationError("App Lock must be enabled or disabled");
  }

  await User.update(
    { app_lock_enabled: appLockEnabled },
    { where: { id: userId } },
  );

  return appLockEnabled;
};

export const updateEmail = async (userId, currentEmail, newEmail) => {
  if (
    typeof currentEmail !== "string" ||
    typeof newEmail !== "string" ||
    !currentEmail.trim() ||
    !newEmail.trim()
  ) {
    throw validationError("Current and new email addresses are required");
  }

  const normalizedCurrentEmail = currentEmail.trim().toLowerCase();
  const normalizedEmail = newEmail.trim().toLowerCase();
  const user = await User.findByPk(userId, { attributes: ["email"] });
  if (!user || user.email.toLowerCase() !== normalizedCurrentEmail) {
    const error = new Error("Current email address is incorrect");
    error.statusCode = 401;
    throw error;
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw validationError("Please enter a valid email address");
  }

  const existingUser = await User.findOne({
    where: where(fn("LOWER", col("email")), normalizedEmail),
  });

  if (existingUser && existingUser.id !== userId) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }

  await User.update({ email: normalizedEmail }, { where: { id: userId } });
  return normalizedEmail;
};

export const updatePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw validationError("Current and new passwords are required");
  }

  if (newPassword.length < 8) {
    throw validationError("New password must be at least 8 characters");
  }

  const user = await User.findByPk(userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    throw validationError(
      "New password must be different from current password",
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await User.update({ password: passwordHash }, { where: { id: userId } });
};

export const deleteAccount = async (userId, password) => {
  if (typeof password !== "string" || !password.trim()) {
    throw validationError("Password is required to delete your account");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    const error = new Error("Password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  await Promise.all([
    RefreshToken.destroy({ where: { user_id: userId } }),
    PushToken.destroy({ where: { user_id: userId } }),
    NotificationLog.destroy({ where: { user_id: userId } }),
    Birthday.destroy({ where: { user_id: userId } }),
    Borrowed.destroy({ where: { user_id: userId } }),
    Expense.destroy({ where: { user_id: userId } }),
    Habit.destroy({ where: { user_id: userId } }),
    Income.destroy({ where: { user_id: userId } }),
    Lended.destroy({ where: { user_id: userId } }),
    Note.destroy({ where: { user_id: userId } }),
    PasswordEntry.destroy({ where: { user_id: userId } }),
    PlannedExpense.destroy({ where: { user_id: userId } }),
    Todo.destroy({ where: { user_id: userId } }),
  ]);

  const deletedCount = await User.destroy({ where: { id: userId } });

  if (deletedCount === 0) {
    const error = new Error("Account could not be deleted");
    error.statusCode = 500;
    throw error;
  }
};
