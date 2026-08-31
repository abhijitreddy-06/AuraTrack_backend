import * as lendedService from "../services/lended.service.js";

export const getLendedEntries = async (req, res, next) => {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: await lendedService.getLendedEntries(req.user.id),
      });
  } catch (error) {
    next(error);
  }
};

export const createLendedEntry = async (req, res, next) => {
  try {
    const entry = await lendedService.createLendedEntry(req.user.id, req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Lended entry created successfully",
        data: entry,
      });
  } catch (error) {
    next(error);
  }
};

export const updateLendedEntry = async (req, res, next) => {
  try {
    const entry = await lendedService.updateLendedEntry(
      req.user.id,
      req.params.id,
      req.body,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Lended entry updated successfully",
        data: entry,
      });
  } catch (error) {
    next(error);
  }
};

export const deleteLendedEntry = async (req, res, next) => {
  try {
    await lendedService.deleteLendedEntry(req.user.id, req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Lended entry deleted successfully" });
  } catch (error) {
    next(error);
  }
};
