import { Op } from "sequelize";
import { PushToken } from "./models/pushToken.model.js";
import { NotificationLog } from "./models/notificationLog.model.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const expoTokenPattern = /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/;
const EXPO_SEND_BATCH_SIZE = 100;
const EXPO_RECEIPT_BATCH_SIZE = 1_000;

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

const sendExpoMessages = async (tokens, title, body, data) => {
  if (!tokens.length) return { delivered: false, invalidTokens: [], receiptIds: [] };

  const batches = Array.from(
    { length: Math.ceil(tokens.length / EXPO_SEND_BATCH_SIZE) },
    (_, index) => tokens.slice(index * EXPO_SEND_BATCH_SIZE, (index + 1) * EXPO_SEND_BATCH_SIZE),
  );
  const results = await Promise.all(batches.map(async (batch) => {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json" },
    body: JSON.stringify(batch.map((to) => ({
      to,
      title,
      body,
      sound: "default",
      priority: "high",
      channelId: "default",
      data,
    }))),
  });
  if (!response.ok) throw new Error(`Expo push service returned ${response.status}`);
  const result = await response.json();
  const tickets = Array.isArray(result.data) ? result.data : [];
  return { batch, tickets };
  }));

  const invalidTokens = results.flatMap(({ batch, tickets }) => tickets.flatMap((ticket, index) =>
    ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? [batch[index]] : [],
  ));
  const receiptIds = results.flatMap(({ batch, tickets }) => tickets.flatMap((ticket, index) =>
    ticket.status === "ok" && typeof ticket.id === "string" ? [{ ticketId: ticket.id, token: batch[index] }] : [],
  ));
  const ticketErrors = results.flatMap(({ tickets }) => tickets.flatMap((ticket) =>
    ticket.status === "error" ? [ticket.details?.error || "UnknownError"] : [],
  ));
  if (ticketErrors.length) {
    console.error(`Expo push ticket errors: ${[...new Set(ticketErrors)].join(", ")}`);
  }
  return { delivered: receiptIds.length > 0, invalidTokens, receiptIds };
};

export const sendReminderOnce = async ({ userId, type, reminderDate, title, body }) => {
  const tokenRows = await PushToken.findAll({ where: { user_id: userId }, attributes: ["token"] });
  const tokens = tokenRows.map(({ token }) => token);
  // Do not consume today's once-only reminder before this user has a device to receive it.
  if (!tokens.length) return false;

  const log = await reserveReminder(userId, type, reminderDate);
  if (!log) return false;
  try {
    const { delivered, invalidTokens, receiptIds } = await sendExpoMessages(tokens, title, body, { type, reminderDate });
    if (invalidTokens.length) await PushToken.destroy({ where: { token: { [Op.in]: invalidTokens } } });
    if (receiptIds.length) await recordExpoReceipts(receiptIds);
    if (!delivered) throw new Error("Expo did not accept any push messages");
    await log.update({ sent_at: new Date() });
    return delivered;
  } catch (error) {
    // The job may be safely re-run after a definite request failure. Tickets accepted by Expo are
    // recorded above, so receipt processing—not a retry—handles their terminal errors.
    await log.destroy();
    console.error(`Unable to send ${type} reminder for user ${userId}:`, error);
    return false;
  }
};

const recordExpoReceipts = async (receipts) => {
  const { ExpoReceipt } = await import("./models/expoReceipt.model.js");
  await ExpoReceipt.bulkCreate(
    receipts.map(({ ticketId, token }) => ({ ticket_id: ticketId, token })),
    { ignoreDuplicates: true },
  );
};

export const checkExpoReceipts = async () => {
  const { ExpoReceipt } = await import("./models/expoReceipt.model.js");
  const pending = await ExpoReceipt.findAll({
    where: { checked_at: null },
    attributes: ["id", "ticket_id", "token"],
    order: [["created_at", "ASC"]],
    limit: EXPO_RECEIPT_BATCH_SIZE,
  });
  if (!pending.length) return { checked: 0, invalidTokens: 0 };

  const response = await fetch(EXPO_RECEIPTS_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json" },
    body: JSON.stringify({ ids: pending.map(({ ticket_id }) => ticket_id) }),
  });
  if (!response.ok) throw new Error(`Expo receipt service returned ${response.status}`);
  const result = await response.json();
  const receipts = result.data && typeof result.data === "object" ? result.data : {};
  const completed = pending.filter(({ ticket_id }) => receipts[ticket_id]);
  const invalidTokens = completed.flatMap(({ ticket_id, token }) =>
    receipts[ticket_id]?.status === "error" && receipts[ticket_id]?.details?.error === "DeviceNotRegistered" ? [token] : [],
  );
  const receiptErrors = completed.flatMap(({ ticket_id }) =>
    receipts[ticket_id]?.status === "error" ? [receipts[ticket_id]?.details?.error || "UnknownError"] : [],
  );
  if (receiptErrors.length) {
    console.error(`Expo push receipt errors: ${[...new Set(receiptErrors)].join(", ")}`);
  }
  if (invalidTokens.length) await PushToken.destroy({ where: { token: { [Op.in]: invalidTokens } } });
  if (completed.length) await ExpoReceipt.update(
    { checked_at: new Date() },
    { where: { id: { [Op.in]: completed.map(({ id }) => id) } } },
  );
  return { checked: completed.length, invalidTokens: invalidTokens.length };
};
