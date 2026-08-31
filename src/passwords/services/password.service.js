import crypto from "crypto";
import { PasswordEntry } from "../models/password.model.js";

const key = process.env.PASSWORD_VAULT_KEY;

if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
  throw new Error("PASSWORD_VAULT_KEY must be a 64-character hexadecimal key");
}

const encryptionKey = Buffer.from(key, "hex");

const fail = (message, statusCode) => {
  Object.assign(new Error(message), { statusCode });
};

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const encrypt = (value) => {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
};

const decrypt = (payload) => {
  const [iv, tag, data] = payload
    .split(":")
    .map((part) => Buffer.from(part, "base64"));

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
};

const publicEntry = (entry) => ({
  id: entry.id,
  title: entry.title,
  key: decrypt(entry.key_),
  value: decrypt(entry.value_),
  created_at: entry.created_at,
});

const metadata = (entry) => ({
  id: entry.id,
  title: entry.title,
  created_at: entry.created_at,
});

const validate = (data, partial = false) => {
  const values = {};

  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw fail("Title is required", 400);
    }

    if (data.title.trim().length > 200) {
      throw fail("Title must be 200 characters or fewer", 400);
    }

    values.title = data.title.trim();
  }

  if (!partial || data.key !== undefined) {
    if (typeof data.key !== "string" || !data.key.trim()) {
      throw fail("Username or email is required", 400);
    }

    values.key_ = encrypt(data.key.trim());
  }

  if (!partial || data.value !== undefined) {
    if (typeof data.value !== "string" || !data.value.trim()) {
      throw fail("Password is required", 400);
    }

    values.value_ = encrypt(data.value);
  }

  if (partial && !Object.keys(values).length) {
    throw fail("Provide password fields to update", 400);
  }

  return values;
};

export const getPasswordEntries = async (userId) =>
  (
    await PasswordEntry.findAll({
      where: { user_id: userId },
      order: [["title", "ASC"]],
    })
  ).map(metadata);

export const getPasswordSecret = async (userId, id) => {
  if (!uuid.test(id)) {
    throw fail("Invalid password entry ID", 400);
  }

  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });

  if (!entry) {
    throw fail("Password entry not found", 404);
  }

  return publicEntry(entry);
};

export const createPasswordEntry = async (userId, data) =>
  metadata(await PasswordEntry.create({ user_id: userId, ...validate(data) }));

export const updatePasswordEntry = async (userId, id, data) => {
  if (!uuid.test(id)) {
    throw fail("Invalid password entry ID", 400);
  }

  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });

  if (!entry) {
    throw fail("Password entry not found", 404);
  }

  await entry.update(validate(data, true));

  return metadata(entry);
};

export const deletePasswordEntry = async (userId, id) => {
  if (!uuid.test(id)) {
    throw fail("Invalid password entry ID", 400);
  }

  const entry = await PasswordEntry.findOne({ where: { id, user_id: userId } });

  if (!entry) {
    throw fail("Password entry not found", 404);
  }

  await entry.destroy();
};
