import * as incomeService from "../services/income.service.js";

export const getIncomes = async (req, res, next) => {
  try {
    res
      .status(200)
      .json({
        success: true,
        data: await incomeService.getIncomes(req.user.id),
      });
  } catch (error) {
    next(error);
  }
};

export const createIncome = async (req, res, next) => {
  try {
    const income = await incomeService.createIncome(req.user.id, req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Income created successfully",
        data: income,
      });
  } catch (error) {
    next(error);
  }
};

export const updateIncome = async (req, res, next) => {
  try {
    const income = await incomeService.updateIncome(
      req.user.id,
      req.params.id,
      req.body,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Income updated successfully",
        data: income,
      });
  } catch (error) {
    next(error);
  }
};

export const deleteIncome = async (req, res, next) => {
  try {
    await incomeService.deleteIncome(req.user.id, req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Income deleted successfully" });
  } catch (error) {
    next(error);
  }
};
