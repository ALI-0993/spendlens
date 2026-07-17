import { useState, useEffect } from 'react';
import { useTransactionStore } from '../../store/transactionStore';
import { getMonthlyStats, formatINR } from '../../utils/calculations';

const AIInsights = () => {
  const { transactions, selectedMonth } = useTransactionStore();
  const stats = getMonthlyStats(transactions, selectedMonth);

  // Build category totals
  const current = transactions.filter(
    (t) => t.date.startsWith(selectedMonth) && t.type === 'debit'
  );

  const hasData = current.length > 0;
  const categoryMap: Record<string, number> = {};
  current.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const sorted = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0];
  const topCategoryPercent = topCategory
    ? Math.round((topCategory[1] / stats.totalSpent) * 100)
    : 0;
  const savingsRate = stats.totalIncome > 0
    ? Math.round((stats.totalSaved / stats.totalIncome) * 100)
    : 0;

  const insights = [
    {
      title: savingsRate >= 20 ? 'Great Savings Rate' : 'Low Savings Rate',
      body: savingsRate >= 20
        ? `You saved ${savingsRate}% of your income this month. That's a healthy financial habit.`
        : `You saved only ${savingsRate}% of your income. Try to target at least 20% savings.`,
      color: savingsRate >= 20 ? '#10B981' : '#F59E0B',
    },
    {
      title: `High ${topCategory?.[0] ?? ''} Spend`,
      body: `${topCategory?.[0] ?? 'This category'} makes up ${topCategoryPercent}% of your total spend at ${formatINR(topCategory?.[1] ?? 0)}. Consider if this aligns with your budget.`,
      color: '#6366F1',
    },
    {
      title: stats.spentChange > 10 ? 'Spending Increased' : 'Spending Stable',
      body: stats.spentChange > 10
        ? `Your spending is up ${stats.spentChange}% vs last month. Review your ${topCategory?.[0]} and Shopping expenses.`
        : `Your spending is ${stats.spentChange >= 0 ? 'up' : 'down'} ${Math.abs(stats.spentChange)}% vs last month. You're on track.`,
      color: stats.spentChange > 10 ? '#EF4444' : '#3B82F6',
    },
  ];

  // AI-generated insights fetched from our /api/insights endpoint.
  // We keep the rule-based `insights` array above as a fallback —
  // if the AI call is loading, errors, or the person has no internet,
  // the panel still shows something useful instead of breaking.
  const [aiInsights, setAiInsights] = useState<{ title: string; message: string }[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    if (!hasData) return;

    const summary = {
      income: stats.totalIncome,
      expenses: stats.totalSpent,
      saved: stats.totalSaved,
      savingsRatePercent: savingsRate,
      hasPreviousMonthData: stats.hasPreviousMonthData,
      spentChangePercent: stats.hasPreviousMonthData ? stats.spentChange : null,
      incomeChangePercent: stats.hasPreviousMonthData ? stats.incomeChange : null,
      allCategories: sorted.map(([name, amount]) => ({
        name,
        amount,
        percentOfSpend: Math.round((amount / stats.totalSpent) * 100),
      })),
      largestSingleTransactions: current
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
        .map((t) => ({ merchant: t.merchant, amount: t.amount, category: t.category })),
    };

    setAiLoading(true);
    setAiError(false);

    fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...summary, insightCount: 3 }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('AI request failed');
        return res.json();
      })
      .then((data) => setAiInsights(data))
      .catch(() => setAiError(true))
      .finally(() => setAiLoading(false));
  }, [selectedMonth, hasData, stats.totalSpent]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">AI Insights</h2>
      </div>

      {/* Insights list */}
      {!hasData ? (
        <div className="px-5 py-10 flex flex-col items-center text-center">
          <p className="text-sm font-semibold text-gray-700">
            Not enough data yet
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
            Upload a statement for this month to get personalized insights.
          </p>
        </div>
      ) : (
      <div className="flex flex-col divide-y divide-gray-50">
        {aiLoading && (
          <div className="px-5 py-4 text-xs text-gray-400">Thinking...</div>
        )}
        {!aiLoading && aiInsights && !aiError
          ? aiInsights.map((insight) => (
              <div key={insight.title} className="px-5 py-4 flex gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-indigo-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.message}</p>
                </div>
              </div>
            ))
          : !aiLoading &&
            insights.map((insight) => (
              <div key={insight.title} className="px-5 py-4 flex gap-3">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: insight.color }}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.body}</p>
                </div>
              </div>
            ))}
      </div>
      )}
    </div>
  );
};

export default AIInsights;