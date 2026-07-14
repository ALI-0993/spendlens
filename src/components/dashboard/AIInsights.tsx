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
        {insights.map((insight) => (
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