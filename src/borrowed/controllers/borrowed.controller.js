import * as borrowedService from "../services/borrowed.service.js";

export const getBorrowedEntries = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await borrowedService.getBorrowedEntries(req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const createBorrowedEntry = async (req, res, next) => {
  try {
    const entry = await borrowedService.createBorrowedEntry(
      req.user.id,
      req.body,
    );
    res.status(201).json({
      success: true,
      message: "Borrowed entry created successfully",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBorrowedEntry = async (req, res, next) => {
  try {
    const entry = await borrowedService.updateBorrowedEntry(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Borrowed entry updated successfully",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBorrowedEntry = async (req, res, next) => {
  try {
    await borrowedService.deleteBorrowedEntry(req.user.id, req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Borrowed entry deleted successfully" });
  } catch (error) {
    next(error);
  }
};
