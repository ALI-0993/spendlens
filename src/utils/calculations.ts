import { type Transaction } from '../types';

export const getMonthlyStats = (transactions: Transaction[], month: string) => {
  // Filter transactions for the given month e.g. '2025-05'
  const current = transactions.filter((t) => t.date.startsWith(month));

  // Get previous month string e.g. '2025-05' → '2025-04'
  const [year, mon] = month.split('-').map(Number);
  const prevDate = new Date(year, mon - 2, 1); // mon-2 because months are 0-indexed
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const previous = transactions.filter((t) => t.date.startsWith(prevMonth));

  const calcTotals = (txns: Transaction[]) => {
    const income = txns.filter((t) => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const spent = txns.filter((t) => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const saved = income - spent;

    // Find top spending category (exclude Income)
    const categoryTotals: Record<string, number> = {};
    txns.filter((t) => t.type === 'debit').forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { income, spent, saved, topCategory };
  };

  const curr = calcTotals(current);
  const prev = calcTotals(previous);

  // Calculate % change — positive means increased, negative means decreased
  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) {
  return curr > 0 ? 100 : 0;
}
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    totalSpent: curr.spent,
    totalIncome: curr.income,
    totalSaved: curr.saved,
    topCategory: curr.topCategory,
    spentChange: pctChange(curr.spent, prev.spent),
    incomeChange: pctChange(curr.income, prev.income),
    savedChange: pctChange(curr.saved, prev.saved),
  };
};

// Builds month-by-month spending totals across a given list of months,
// for use in multi-month trend charts (e.g. the Insights page).
// Unlike getMonthlyStats (which compares ONE month to the one before it),
// this returns data for ALL requested months side by side.
export const getMonthlyTrend = (transactions: Transaction[], months: string[]) => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // For each requested month, total up that month's debit transactions
  const trendData = months.map((month) => {
    const monthTxns = transactions.filter((t) => t.date.startsWith(month) && t.type === 'debit');
    const total = monthTxns.reduce((sum, t) => sum + t.amount, 0);

    const [year, mon] = month.split('-').map(Number);
    const label = `${monthNames[mon - 1]} ${year}`;

    return { month, label, total };
  });

  // Average across all the months we just calculated
  const average = Math.round(
    trendData.reduce((sum, m) => sum + m.total, 0) / trendData.length
  );

  // Find the highest and lowest spending months by comparing totals.
  // reduce() here walks through the list once, keeping track of
  // whichever entry has the biggest (or smallest) total so far.
  const highest = trendData.reduce((max, m) => (m.total > max.total ? m : max), trendData[0]);
  const lowest = trendData.reduce((min, m) => (m.total < min.total ? m : min), trendData[0]);

  return { trendData, average, highest, lowest };
};

// Builds a side-by-side category comparison between two specific months.
// Returns one entry per category that appears in EITHER month, so a
// category with ₹0 this month (but spending last month) still shows up
// correctly as a 0 rather than being silently dropped.
export const getCategoryComparison = (
  transactions: Transaction[],
  currentMonth: string,
  previousMonth: string
) => {
  const sumByCategory = (month: string) => {
    const monthTxns = transactions.filter((t) => t.date.startsWith(month) && t.type === 'debit');
    const totals: Record<string, number> = {};
    monthTxns.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  };

  const currentTotals = sumByCategory(currentMonth);
  const previousTotals = sumByCategory(previousMonth);

  // Union of category names from both months, so nothing gets missed
  const allCategories = Array.from(
    new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)])
  );

  const comparison = allCategories
    .filter((cat) => cat !== 'Income') // Income isn't a spending category, exclude it
    .map((category) => {
      const current = currentTotals[category] || 0;
      const previous = previousTotals[category] || 0;
      const change = previous > 0
        ? Math.round(((current - previous) / previous) * 100)
        : (current > 0 ? 100 : 0);

      return { category, current, previous, change };
    })
    .sort((a, b) => b.current - a.current); // Highest spend first, same as Dashboard's CategoryChart

  return comparison;
};

// Scans all transactions and returns the most recent month present, as
// 'YYYY-MM'. Used right after a CSV/Excel upload to point selectedMonth
// at data that actually exists, instead of leaving it on a stale default
// that the new data might not match at all.
export const getMostRecentMonth = (transactions: Transaction[]): string | null => {
  if (transactions.length === 0) return null;

  const mostRecentDate = transactions.reduce((latest, t) => {
    return t.date > latest ? t.date : latest;
  }, transactions[0].date);

  return mostRecentDate.slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'
};

// Returns up to `count` most recent distinct months that actually have
// transactions, newest first (e.g. ['2025-05', '2025-04', ...]).
// Used by the Insights page instead of a hardcoded month list, since
// real uploaded data won't always cover a clean, predictable range.
export const getRecentMonths = (transactions: Transaction[], count: number): string[] => {
  const uniqueMonths = Array.from(new Set(transactions.map((t) => t.date.slice(0, 7))));
  return uniqueMonths.sort().reverse().slice(0, count);
};

// Merges newly parsed transactions into the existing set, skipping any
// that look like duplicates of something already present. Two
// transactions are considered duplicates if they match on date, amount,
// merchant, AND type — matching on all four avoids false positives like
// two genuinely separate ₹50 payments to the same person on different
// days (date differs) or two real back-to-back purchases at the same
// shop on the same day for different amounts (amount differs).
export const mergeTransactions = (
  existing: Transaction[],
  incoming: Transaction[]
): { merged: Transaction[]; addedCount: number; duplicateCount: number } => {
  const existingKeys = new Set(
    existing.map((t) => `${t.date}|${t.amount}|${t.merchant}|${t.type}`)
  );

  const newOnes: Transaction[] = [];
  let duplicateCount = 0;

  for (const t of incoming) {
    const key = `${t.date}|${t.amount}|${t.merchant}|${t.type}`;
    if (existingKeys.has(key)) {
      duplicateCount++;
    } else {
      existingKeys.add(key); // also catch duplicates WITHIN the same incoming file
      newOnes.push(t);
    }
  }

  return {
    merged: [...existing, ...newOnes],
    addedCount: newOnes.length,
    duplicateCount,
  };
};

export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const getDailyData = (transactions: Transaction[], month: string) => {
  const daysInMonth = new Date(
    Number(month.split('-')[0]),
    Number(month.split('-')[1]),
    0
  ).getDate();

  let runningIncome = 0;
  let runningExpense = 0;

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const dateStr = `${month}-${day}`;
    const dayTxns = transactions.filter((t) => t.date === dateStr);

    runningIncome += dayTxns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    runningExpense += dayTxns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    return {
      date: `${Number(month.split('-')[1])}/${i + 1}`,
      income: runningIncome,
      expense: runningExpense,
    };
  });
};