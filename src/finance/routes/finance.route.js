import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { Expense } from "../../expenses/models/expense.model.js";
import { Income } from "../../incomes/models/income.model.js";
import { Borrowed } from "../../borrowed/models/borrowed.model.js";
import { Lended } from "../../lended/models/lended.model.js";
import { analytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/analytics", protect, analytics);

router.get("/summary", protect, async (req, res, next) => {
  try {
    const [expenses, incomes, borrowed, lended] = await Promise.all([
      Expense.findAll({ where: { user_id: req.user.id } }),
      Income.findAll({ where: { user_id: req.user.id } }),
      Borrowed.findAll({ where: { user_id: req.user.id } }),
      Lended.findAll({ where: { user_id: req.user.id } }),
    ]);

    const map = (items, type, direction, field) =>
      items.map((item) => ({
        id: `${type}-${item.id}`,
        type,
        direction,
        title: item[field],
        amount: item.amount,
        date: item.date,
        time: item.time,
      }));

    const transactions = [
      ...map(incomes, "Income", "gain", "title"),
      ...map(borrowed, "Borrowed", "gain", "person_name"),
      ...map(expenses, "Expense", "loss", "title"),
      ...map(lended, "Lent", "loss", "person_name"),
    ].sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    );

    const totalGained = transactions
      .filter((item) => item.direction === "gain")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalLost = transactions
      .filter((item) => item.direction === "loss")
      .reduce((sum, item) => sum + item.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        balance: totalGained - totalLost,
        totalGained,
        totalLost,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
