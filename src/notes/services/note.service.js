import { Note } from "../models/note.model.js";

export const getNotes = async (userId) => {
  const notes = await Note.findAll({
    where: {
      user_id: userId,
    },
    order: [["created_at", "DESC"]],
  });

  return notes;
};

export const createNote = async (userId, data) => {
  const { text } = data;

  if (!text || !text.trim()) {
    const error = new Error("Note text is required");
    error.statusCode = 400;
    throw error;
  }

  const note = await Note.create({
    user_id: userId,
    text: text.trim(),
  });

  return note;
};

export const updateNote = async (userId, noteId, data) => {
  const { text } = data;

  if (!text || !text.trim()) {
    const error = new Error("Note text is required");
    error.statusCode = 400;
    throw error;
  }

  const note = await Note.findOne({
    where: {
      id: noteId,
      user_id: userId,
    },
  });

  if (!note) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }

  await note.update({
    text: text.trim(),
  });

  return note;
};

export const deleteNote = async (userId, noteId) => {
  const note = await Note.findOne({
    where: {
      id: noteId,
      user_id: userId,
    },
  });

  if (!note) {
    const error = new Error("Note not found");
    error.statusCode = 404;
    throw error;
  }
  
  await note.destroy();
};