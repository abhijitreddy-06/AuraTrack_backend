import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { Document } from "../models/document.model.js";

const storageUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_DOCS_BUCKET || "auratrack";
const masterKey = process.env.DOCUMENT_ENCRYPTION_KEY;

const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const getMasterBuffer = () => {
  if (!masterKey || !/^[0-9a-f]{64}$/i.test(masterKey)) {
    throw fail(
      "DOCUMENT_ENCRYPTION_KEY must be a 64-character hexadecimal key",
      500,
    );
  }

  return Buffer.from(masterKey, "hex");
};

const getSupabaseClient = () => {
  if (!storageUrl || !serviceKey) {
    throw fail("Supabase storage is not configured on this server", 500);
  }

  return createClient(storageUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const encryptString = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMasterBuffer(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(value, "utf8")),
    cipher.final(),
  ]);

  return `${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
};

const decryptString = (payload) => {
  const [iv, tag, encrypted] = payload.split(":");
  if (!iv || !tag || !encrypted) {
    throw fail("Encrypted metadata is invalid", 500);
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getMasterBuffer(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const makeRandomFileKey = () => crypto.randomBytes(32);

const encryptFile = (buffer) => {
  const fileKey = makeRandomFileKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", fileKey, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  return {
    encryptedBuffer: Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
    key: fileKey,
  };
};

const decryptFile = (buffer, key) => {
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

const metadata = (entry) => ({
  id: entry.id,
  name: entry.name,
  originalName: entry.original_name,
  mimeType: entry.mime_type,
  size: entry.size,
  createdAt: entry.created_at,
});

export const listDocuments = async (userId) =>
  (
    await Document.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    })
  ).map(metadata);

export const createDocument = async (
  userId,
  { name, originalName, mimeType, size, fileContentBase64 },
) => {
  if (typeof name !== "string" || !name.trim()) {
    throw fail("Document name is required", 400);
  }

  if (typeof originalName !== "string" || !originalName.trim()) {
    throw fail("Original file name is required", 400);
  }

  if (!fileContentBase64 || typeof fileContentBase64 !== "string") {
    throw fail("Document content is required", 400);
  }

  const normalizedName = name.trim();
  const buffer = Buffer.from(fileContentBase64, "base64");
  const documentId = randomUUID();
  const extension = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf("."))
    : "";
  const storagePath = `private/${userId}/${documentId}${extension}`;
  const encrypted = encryptFile(buffer);

  const supabase = getSupabaseClient();

  const uploadResult = await supabase.storage
    .from(bucketName)
    .upload(storagePath, encrypted.encryptedBuffer, {
      contentType: mimeType || "application/octet-stream",
      upsert: true,
      cacheControl: "no-store",
    });

  if (uploadResult.error) {
    throw fail(uploadResult.error.message || "Failed to upload document", 500);
  }

  const document = await Document.create({
    id: documentId,
    user_id: userId,
    name: normalizedName,
    original_name: originalName.trim(),
    mime_type: mimeType || "application/octet-stream",
    size: Number(size) || buffer.length,
    storage_path: storagePath,
    encrypted_key: encryptString(encrypted.key.toString("base64")),
  });

  return metadata(document);
};

export const getDocument = async (userId, documentId) => {
  const document = await Document.findOne({
    where: { id: documentId, user_id: userId },
  });

  if (!document) {
    throw fail("Document not found", 404);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(document.storage_path);
  if (error) {
    throw fail("Document file could not be read", 500);
  }

  const encryptedFile = Buffer.from(await data.arrayBuffer());
  const fileKey = Buffer.from(decryptString(document.encrypted_key), "base64");
  const content = decryptFile(encryptedFile, fileKey);

  return {
    ...metadata(document),
    fileContentBase64: content.toString("base64"),
  };
};

export const deleteDocument = async (userId, documentId) => {
  const document = await Document.findOne({
    where: { id: documentId, user_id: userId },
  });

  if (!document) {
    throw fail("Document not found", 404);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([document.storage_path]);
  if (error) {
    throw fail("Could not delete document from storage", 500);
  }

  await document.destroy();
};
