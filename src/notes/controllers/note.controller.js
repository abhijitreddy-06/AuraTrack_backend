import * as noteService from "../services/note.service.js";

export const getNotes = async (req, res, next) => {
  try {
    const notes = await noteService.getNotes(req.user.id);

    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const note = await noteService.createNote(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const note = await noteService.updateNote(
      req.user.id,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    await noteService.deleteNote(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};