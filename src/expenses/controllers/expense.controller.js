import * as expenseService from "../services/expense.service.js";

export const getExpenses = async (req, res, next) => {
  try {
    const expenses = await expenseService.getExpenses(req.user.id);
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    await expenseService.deleteExpense(req.user.id, req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};
