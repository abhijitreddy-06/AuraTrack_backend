import { Op } from "sequelize";
import { PushToken } from "./models/pushToken.model.js";
import { NotificationLog } from "./models/notificationLog.model.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const expoTokenPattern = /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/;

export const registerPushToken = async (userId, token) => {
  if (typeof token !== "string" || !expoTokenPattern.test(token)) {
    const error = new Error("Invalid Expo push token");
    error.statusCode = 400;
    throw error;
  }

  const existing = await PushToken.findOne({ where: { token } });
  if (existing) {
    await existing.update({ user_id: userId, updated_at: new Date() });
    return existing;
  }
  return PushToken.create({ user_id: userId, token });
};

export const unregisterPushToken = (userId, token) =>
  PushToken.destroy({ where: { user_id: userId, token } });

const reserveReminder = async (userId, type, reminderDate) => {
  const [log, created] = await NotificationLog.findOrCreate({
    where: { user_id: userId, type, reminder_date: reminderDate },
    defaults: { user_id: userId, type, reminder_date: reminderDate },
  });
  return created ? log : null;
};

const sendExpoMessages = async (tokens, title, body) => {
  if (!tokens.length) return { delivered: false, invalidTokens: [] };
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default", priority: "high" }))),
  });
  if (!response.ok) throw new Error(`Expo push service returned ${response.status}`);
  const result = await response.json();
  const tickets = Array.isArray(result.data) ? result.data : [];
  const invalidTokens = tickets.flatMap((ticket, index) =>
    ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? [tokens[index]] : [],
  );
  return { delivered: tickets.some((ticket) => ticket.status === "ok"), invalidTokens };
};

export const sendReminderOnce = async ({ userId, type, reminderDate, title, body }) => {
  const log = await reserveReminder(userId, type, reminderDate);
  if (!log) return false;
  try {
    const tokens = await PushToken.findAll({ where: { user_id: userId }, attributes: ["token"] });
    const { delivered, invalidTokens } = await sendExpoMessages(tokens.map(({ token }) => token), title, body);
    if (invalidTokens.length) await PushToken.destroy({ where: { token: { [Op.in]: invalidTokens } } });
    await log.update({ sent_at: new Date() });
    return delivered;
  } catch (error) {
    // Keep the reservation: a retry after an uncertain network result must not duplicate a notification.
    console.error(`Unable to send ${type} reminder for user ${userId}:`, error);
    return false;
  }
};
