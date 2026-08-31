import { Expense } from "../../expenses/models/expense.model.js";
import { Income } from "../../incomes/models/income.model.js";
import { addISTDays, getISTDate } from "../../utils/ist.js";

const PERIODS = new Set(["week", "month", "3months", "6months", "year"]);

const toCalendarDate = (date) => new Date(`${date}T12:00:00.000Z`);
const monthKey = (date) => date.slice(0, 7);
const getParts = (date) => date.split("-").map(Number);
const firstDayOfMonth = (date) => `${date.slice(0, 7)}-01`;
const addMonths = (date, months) => {
  const [year, month] = getParts(date);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  return target.toISOString().slice(0, 10);
};
const istWeekday = (date) => toCalendarDate(date).getUTCDay() || 7;

const getPeriod = (period) => {
  const end = getISTDate();
  let start = end;
  let bucketType = "month";
  let bucketCount = 1;

  if (period === "week") {
    start = addISTDays(end, -(istWeekday(end) - 1));
    bucketType = "day";
    bucketCount = 7;
  } else if (period === "month") {
    start = firstDayOfMonth(end);
    bucketType = "week";
    bucketCount = Math.ceil(getParts(end)[2] / 7);
  } else {
    const months = period === "3months" ? 3 : period === "6months" ? 6 : 12;
    start = addMonths(firstDayOfMonth(end), -months + 1);
    bucketCount = months;
  }

  return { start, end, bucketType, bucketCount };
};

const buildBuckets = ({ start, end, bucketType, bucketCount }) => {
  const buckets = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const bucketDate = bucketType === "day" ? addISTDays(start, index) : bucketType === "week" ? addISTDays(start, index * 7) : addMonths(start, index);
    if (bucketDate > end) break;
    const label =
      bucketType === "day"
        ? toCalendarDate(bucketDate).toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "UTC",
          })
        : bucketType === "week"
          ? `W${index + 1}`
          : toCalendarDate(bucketDate).toLocaleDateString("en-US", {
              month: "short",
              timeZone: "UTC",
            });
    buckets.push({
      key:
        bucketType === "day"
          ? bucketDate
          : bucketType === "week"
            ? `${monthKey(bucketDate)}-w${index + 1}`
            : monthKey(bucketDate),
      label,
      income: 0,
      expenses: 0,
    });
  }
  return buckets;
};

const bucketIndex = (date, period) => {
  if (period.bucketType === "day")
    return Math.floor((toCalendarDate(date) - toCalendarDate(period.start)) / 86400000);
  if (period.bucketType === "week")
    return Math.floor((getParts(date)[2] - 1) / 7);
  return (
    (getParts(date)[0] - getParts(period.start)[0]) * 12 +
    getParts(date)[1] - getParts(period.start)[1]
  );
};

export const getAnalytics = async (userId, requestedPeriod = "month") => {
  const periodName = PERIODS.has(requestedPeriod) ? requestedPeriod : "month";
  const period = getPeriod(periodName);
  const [expenses, incomes] = await Promise.all([
    Expense.findAll({
      where: { user_id: userId },
      attributes: ["title", "amount", "date"],
    }),
    Income.findAll({
      where: { user_id: userId },
      attributes: ["amount", "date"],
    }),
  ]);
  const recordsStart = period.start;
  const recordsEnd = period.end;
  const inRange = (item) =>
    item.date >= recordsStart && item.date <= recordsEnd;
  const periodExpenses = expenses.filter(inRange);
  const periodIncomes = incomes.filter(inRange);
  const totalIncome = periodIncomes.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalExpenses = periodExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const buckets = buildBuckets(period);

  periodIncomes.forEach((item) => {
    const index = bucketIndex(item.date, period);
    if (buckets[index]) buckets[index].income += Number(item.amount);
  });
  periodExpenses.forEach((item) => {
    const index = bucketIndex(item.date, period);
    if (buckets[index]) buckets[index].expenses += Number(item.amount);
  });

  const categoryTotals = new Map();
  periodExpenses.forEach((item) => {
    const category = item.title.trim() || "Other";
    categoryTotals.set(
      category,
      (categoryTotals.get(category) || 0) + Number(item.amount),
    );
  });
  const sortedCategories = [...categoryTotals.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const visibleCategories = sortedCategories.slice(0, 4);
  const otherAmount = sortedCategories
    .slice(4)
    .reduce((sum, [, amount]) => sum + amount, 0);
  if (otherAmount > 0) visibleCategories.push(["Others", otherAmount]);
  const spendingBreakdown = visibleCategories.map(([name, amount]) => ({
    name,
    amount,
    percentage: totalExpenses ? Math.round((amount / totalExpenses) * 100) : 0,
  }));

  return {
    period: periodName,
    overview: {
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
    },
    incomeExpense: buckets.map(
      ({ label, income, expenses: expenseAmount }) => ({
        label,
        income,
        expenses: expenseAmount,
      }),
    ),
    spendingBreakdown,
    spendingTrend: buckets.map(({ label, expenses: expenseAmount }) => ({
      label,
      amount: expenseAmount,
    })),
    topSpending: sortedCategories.slice(0, 5).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses
        ? Math.round((amount / totalExpenses) * 100)
        : 0,
    })),
  };
};
