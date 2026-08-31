import * as service from "../services/plannedExpense.service.js";

export const getPlannedExpenses = async (req, res, next) => {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: await service.getPlannedExpenses(req.user.id),
      });
  } catch (error) {
    next(error);
  }
};

export const createPlannedExpense = async (req, res, next) => {
  try {
    const entry = await service.createPlannedExpense(req.user.id, req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

export const updatePlannedExpense = async (req, res, next) => {
  try {
    const entry = await service.updatePlannedExpense(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

export const deletePlannedExpense = async (req, res, next) => {
  try {
    await service.deletePlannedExpense(req.user.id, req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
