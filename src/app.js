import express from "express";
import cors from "cors";
import authRoutes from "./auth/routes/auth.route.js";
import habitRoutes from "./habits/routes/habit.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import noteRoutes from "./notes/routes/note.route.js";
import birthdayRoutes from "./birthdays/routes/birthday.route.js";
import todoRoutes from "./todo/routes/todo.route.js";
import expenseRoutes from "./expenses/routes/expense.route.js";
import incomeRoutes from "./incomes/routes/income.route.js";
import borrowedRoutes from "./borrowed/routes/borrowed.route.js";
import lendedRoutes from "./lended/routes/lended.route.js";
import plannedExpenseRoutes from "./plannedexpenses/routes/plannedExpense.route.js";
import financeRoutes from "./finance/routes/finance.route.js";
import passwordRoutes from "./passwords/routes/password.route.js";
import settingsRoutes from "./settings/routes/settings.route.js";
import notificationRoutes from "./notifications/notification.route.js";
import documentRoutes from "./documents/routes/document.route.js";
import aiRoutes from "./ai/routes/ai.route.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AuraTrack backend is running",
  });
});

// Public, lightweight endpoint for uptime monitors such as UptimeRobot.
app.get("/api/uptime", (req, res) => {
  res.status(200).json({
    success: true,
    status: "awake",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/birthdays", birthdayRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/incomes", incomeRoutes);
app.use("/api/borrowed", borrowedRoutes);
app.use("/api/lended", lendedRoutes);
app.use("/api/planned-expenses", plannedExpenseRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/passwords", passwordRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

export default app;
