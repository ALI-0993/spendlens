import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ArrowUp, ArrowDown, Sparkles, AlertTriangle, Lightbulb, PiggyBank, BarChart3, UtensilsCrossed, ShoppingBag, Receipt, Car, Film, MoreHorizontal, ArrowLeftRight } from 'lucide-react';
import { useTransactionStore } from '../store/transactionStore';
import { getMonthlyTrend, getCategoryComparison, getRecentMonths, formatINR } from '../utils/calculations';

// Same dark tooltip style as CashFlowChart.tsx, kept consistent across
// every chart in the app so they feel like one product.
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        <p className="mb-1 text-gray-400">{label}</p>
        <p style={{ color: '#6366F1' }}>{formatINR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};


// Icon per category, matching the icons already used elsewhere in the app
// (e.g. DashboardPage.tsx uses UtensilsCrossed for Top Category)
const CATEGORY_ICONS: Record<string, typeof UtensilsCrossed> = {
  'Food & Dining': UtensilsCrossed,
  'Shopping': ShoppingBag,
  'Bills & Utilities': Receipt,
  'Transport': Car,
  'Entertainment': Film,
  'Others': MoreHorizontal,
  'Transfers': ArrowLeftRight,
};

const InsightsPage = () => {
  const { transactions } = useTransactionStore();

  // Most recent months that actually have data, newest first — replaces
  // the old hardcoded list so this works with real uploaded data of any
  // date range, not just a frozen 2024-12 to 2025-05 window.
  const recentMonths = getRecentMonths(transactions, 6);

  // Not enough data to build a meaningful Insights page yet (e.g. brand
  // new user, or a file covering only a single month with nothing to
  // compare it against). Show a friendly empty state instead of crashing
  // on assumptions below that need at least 2 months of data.
  if (recentMonths.length < 2) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-main">Insights</h1>
          <p className="text-text-muted mt-1 text-sm">
            Deeper analysis of your spending patterns and financial behavior.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-10 text-center">
          <Sparkles size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Not enough data yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload at least two months of transactions to see trends and comparisons here.
          </p>
        </div>
      </div>
    );
  }

  // getMonthlyTrend expects oldest-first for a left-to-right chart, so
  // reverse the newest-first list from getRecentMonths.
  const months = [...recentMonths].reverse();
  const { trendData, average, highest, lowest } = getMonthlyTrend(transactions, months);

  // Biggest MoM jump in TOTAL spending, across the whole trend range
  // (not per-category — this is month-to-month overall spend).
  // Calculated here, early, since both Section 1's stat cards AND
  // Section 3's AI insights need this same value — no need to compute it twice.
  let biggestMoMJump = { from: trendData[0], to: trendData[0], changePercent: 0 };
  for (let i = 1; i < trendData.length; i++) {
    const prev = trendData[i - 1];
    const curr = trendData[i];
    const changePercent = prev.total > 0 ? Math.round(((curr.total - prev.total) / prev.total) * 100) : 0;
    if (changePercent > biggestMoMJump.changePercent) {
      biggestMoMJump = { from: prev, to: curr, changePercent };
    }
  }

  // Category comparison — most recent month (current) vs the one before
  // it (previous). Both are dynamic now, derived from whatever data
  // actually exists, instead of hardcoded calendar months.
  const currentMonth = recentMonths[0];
  const previousMonth = recentMonths[1];
  const categoryComparison = getCategoryComparison(transactions, currentMonth, previousMonth);

  // With real data this is virtually always non-empty (any transaction
  // gives at least one category), but guard anyway: Math.max(...[]) is
  // -Infinity, which would silently break every bar's width below.
  const maxCategoryAmount = categoryComparison.length > 0
    ? Math.max(...categoryComparison.map((c) => Math.max(c.current, c.previous)))
    : 0;

  // Build AI insights from real computed data — every number here comes
  // from categoryComparison or trendData above, nothing is hardcoded.

  // Biggest % increase across all categories — undefined if there are no
  // categories at all (e.g. a month with only income, no spending).
  const biggestIncrease = [...categoryComparison].sort((a, b) => b.change - a.change)[0];

  // Find any category that decreased — if none exists, we say so honestly
  // rather than inventing a decrease that didn't happen.
  const decreasedCategory = [...categoryComparison]
    .filter((c) => c.change < 0)
    .sort((a, b) => a.change - b.change)[0];
  const flatCategory = categoryComparison.find((c) => c.change === 0);

  // Savings rate for the current month, same calculation style as
  // the Dashboard's AIInsights.tsx widget — now uses the dynamic
  // currentMonth instead of a hardcoded '2025-05'.
  const currentIncome = transactions
    .filter((t) => t.date.startsWith(currentMonth) && t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentSpent = transactions
    .filter((t) => t.date.startsWith(currentMonth) && t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const savingsRate = currentIncome > 0 ? Math.round(((currentIncome - currentSpent) / currentIncome) * 100) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main">Insights</h1>
        <p className="text-text-muted mt-1 text-sm">
          Deeper analysis of your spending patterns and financial behavior.
        </p>
      </div>

      {/* Section 1 — Spending Trend */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
        {/* Card title row */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-900">Spending Trend Analysis</h2>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Last {months.length} Month{months.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Main layout: 2x2 stat cards on the left, chart on the right —
            matching SummaryCard.tsx's icon-box + label + value pattern
            from the Dashboard, so this feels consistent with the rest of the app */}
        <div className="grid grid-cols-3 gap-5">
          {/* Stat cards — 2x2 grid, takes up 1 of the 3 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50/50 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: '#EEF2FF' }}>
                <BarChart3 size={16} style={{ color: '#6366F1' }} />
              </div>
              <p className="text-xs text-gray-400">Average Monthly Spend</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{formatINR(average)}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50/50 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: '#FEE2E2' }}>
                <ArrowUp size={16} style={{ color: '#EF4444' }} />
              </div>
              <p className="text-xs text-gray-400">Highest Spending Month</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{highest.label}</p>
              <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>{formatINR(highest.total)}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50/50 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: '#DCFCE7' }}>
                <ArrowDown size={16} style={{ color: '#16A34A' }} />
              </div>
              <p className="text-xs text-gray-400">Lowest Spending Month</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{lowest.label}</p>
              <p className="text-xs font-semibold" style={{ color: '#16A34A' }}>{formatINR(lowest.total)}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50/50 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: '#FEF3C7' }}>
                <TrendingUp size={16} style={{ color: '#F59E0B' }} />
              </div>
              <p className="text-xs text-gray-400">Biggest MoM Increase</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">+{biggestMoMJump.changePercent}%</p>
              <p className="text-xs text-gray-400">{biggestMoMJump.from.label} vs {biggestMoMJump.to.label}</p>
            </div>
          </div>

          {/* Chart — takes up the remaining 2 of the 3 columns */}
          <div className="col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 8, bottom: 0 }}>
                {/* Same gradient technique as CashFlowChart.tsx — fades from a
                    light indigo tint at the top to fully transparent at the
                    bottom, giving the line a soft "filled" look underneath it */}
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={48}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#colorTrend)"
                  dot={{ r: 4, fill: '#6366F1' }}
                  activeDot={{ r: 6, fill: '#6366F1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom insight strip */}
        <div className="mt-4 flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
          <TrendingUp size={14} className="text-indigo-500" />
          <span className="text-xs text-indigo-700 font-medium">
            Your highest spending month was {highest.label}, lowest was {lowest.label}.
          </span>
        </div>
      </div>

      

      {/* Section 2 — Category Comparison */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mt-6">
        {/* Header + legend */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">
            Category Breakdown: This Month vs Last Month
          </h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> This Month
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Last Month
            </span>
          </div>
        </div>

        {/* One row per category */}
        <div className="flex flex-col gap-4">
          {categoryComparison.map((item) => {
            const CategoryIcon = CATEGORY_ICONS[item.category] || MoreHorizontal;
            return (
            <div key={item.category}>
              {/* Category name + icon + change badge with arrow */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CategoryIcon size={15} className="text-gray-400" />
                  {item.category}
                </span>
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={
                    item.change >= 0
                      ? { color: '#EF4444', backgroundColor: '#EF444415' }
                      : { color: '#16A34A', backgroundColor: '#16A34A15' }
                  }
                >
                  {item.change >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {Math.abs(item.change)}%
                </span>
              </div>

              {/* This month's bar */}
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(item.current / maxCategoryAmount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-20 text-right">
                  {formatINR(item.current)}
                </span>
              </div>

              {/* Last month's bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gray-300 rounded-full"
                    style={{ width: `${(item.previous / maxCategoryAmount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-20 text-right">
                  {formatINR(item.previous)}
                </span>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Section 3 — AI Insights */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-blue-500" />
          <h2 className="text-base font-bold text-gray-900">AI Insights & Recommendations</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Insight 1 — Biggest category increase */}
          <div className="border-l-4 border-red-400 bg-red-50/40 rounded-r-lg p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-sm font-bold text-gray-900">Overspending Alert</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {biggestIncrease ? (
                <>
                  You spent <span className="font-semibold">{formatINR(biggestIncrease.current - biggestIncrease.previous)} more</span> on{' '}
                  <span className="font-semibold">{biggestIncrease.category}</span> compared to last month —
                  a {biggestIncrease.change}% increase. This is your largest category jump this month.
                </>
              ) : (
                'No category spending to compare yet.'
              )}
            </p>
          </div>

          {/* Insight 2 — Biggest MoM jump in overall spending */}
          <div className="border-l-4 border-amber-400 bg-amber-50/40 rounded-r-lg p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp size={16} className="text-amber-500" />
              <p className="text-sm font-bold text-gray-900">Biggest Monthly Jump</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your overall spending rose <span className="font-semibold">{biggestMoMJump.changePercent}%</span> from{' '}
              <span className="font-semibold">{biggestMoMJump.from.label}</span> to{' '}
              <span className="font-semibold">{biggestMoMJump.to.label}</span> — the sharpest month-to-month
              increase across the last {months.length} months.
            </p>
          </div>

          {/* Insight 3 — Positive trend, only if one genuinely exists.
              If no category decreased, we honestly point to the steadiest
              one instead of inventing a decrease that didn't happen. */}
          <div className="border-l-4 border-green-400 bg-green-50/40 rounded-r-lg p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb size={16} className="text-green-500" />
              <p className="text-sm font-bold text-gray-900">
                {decreasedCategory ? 'Positive Trend' : 'Steady Category'}
              </p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {decreasedCategory ? (
                <>
                  <span className="font-semibold">{decreasedCategory.category}</span> spending decreased by{' '}
                  <span className="font-semibold">{Math.abs(decreasedCategory.change)}%</span> compared to last month.
                  Great job keeping it under control.
                </>
              ) : flatCategory ? (
                <>
                  Every category rose this month, but <span className="font-semibold">{flatCategory.category}</span>{' '}
                  held exactly steady at {formatINR(flatCategory.current)} — no increase there at least.
                </>
              ) : (
                <>All categories increased this month — worth reviewing your budget across the board.</>
              )}
            </p>
          </div>

          {/* Insight 4 — Savings rate */}
          <div className="border-l-4 border-blue-400 bg-blue-50/40 rounded-r-lg p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <PiggyBank size={16} className="text-blue-500" />
              <p className="text-sm font-bold text-gray-900">Savings Rate</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              You saved <span className="font-semibold">{savingsRate}%</span> of your income this month.{' '}
              {savingsRate >= 20
                ? "That's a healthy savings habit — keep it up."
                : 'Try to target at least 20% savings going forward to build a stronger buffer.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;