import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTransactionStore } from "../../store/transactionStore";
import { formatINR } from "../../utils/calculations";
import { CATEGORY_COLORS } from "../../utils/categorize";
import { useState } from "react";

const CategoryChart = () => {
  const { transactions, selectedMonth } = useTransactionStore();
  const [tooltip, setTooltip] = useState<{
    name: string;
    value: number;
    color: string;
  } | null>(null);

  // Build category totals for selected month
  const current = transactions.filter(
    (t) => t.date.startsWith(selectedMonth) && t.type === "debit",
  );
  const totalSpent = current.reduce((s, t) => s + t.amount, 0);

  const categoryMap: Record<string, number> = {};
  current.forEach((t) => {
    const category = t.category || "Others";

    categoryMap[category] = (categoryMap[category] || 0) + t.amount;
  });

  const data = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      percent: totalSpent > 0 ? Math.round((value / totalSpent) * 100) : 0,
    }));

  const topCategory = data[0]?.name || "N/A";

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">
          Spending by Category
        </h2>
        <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1">
          This Month
        </span>
      </div>

      {/* Donut + Legend */}
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative w-48 h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                onMouseEnter={(entry) =>
                  setTooltip({
                    name: entry.name,
                    value: entry.value,
                    color: CATEGORY_COLORS[entry.name] || '#6b7280',
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {tooltip ? (
              <>
                <span
                  className="text-xs font-semibold"
                  style={{ color: tooltip.color }}
                >
                  {tooltip.name}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {formatINR(tooltip.value)}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-gray-900">
                  {formatINR(totalSpent)}
                </span>
                <span className="text-xs text-gray-400">Total</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#6b7280' }}
                />
                <span className="text-xs text-gray-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{item.percent}%</span>
                <span className="text-xs font-semibold text-gray-700">
                  {formatINR(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom insight */}
      <div className="mt-4 flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
        <span className="text-green-500 text-sm">↗</span>
        <span className="text-xs text-green-700 font-medium">
          {topCategory} is your highest spending category
        </span>
      </div>
    </div>
  );
};

export default CategoryChart;
