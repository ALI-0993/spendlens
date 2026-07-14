import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTransactionStore } from "../../store/transactionStore";
import { getDailyData, formatINR } from "../../utils/calculations";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const CustomTooltip = ({ active, payload, label, selectedMonth }: any) => {
  if (active && payload && payload.length) {
    const monthIndex = Number(selectedMonth.split("-")[1]) - 1;
    const day = label?.split("/")?.[1];
    return (
      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        <p className="mb-1 text-gray-400">{`${monthNames[monthIndex]} ${day}`}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {formatINR(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CashFlowChart = () => {
  const { transactions, selectedMonth } = useTransactionStore();
  const data = getDailyData(transactions, selectedMonth);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Cash Flow Analysis
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthNames[Number(selectedMonth.split("-")[1]) - 1]}{" "}
            {selectedMonth.split("-")[0]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1">
            {monthNames[Number(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#6366F1" }}
            />
            <span className="text-sm text-gray-500">Expense</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 20, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={9}
            tickFormatter={(value) => {
              const [, day] = value.split("/");
              const monthIndex = Number(selectedMonth.split("-")[1]) - 1;
              return `${monthNames[monthIndex]} ${day}`;
            }}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)}
          />
          <Tooltip content={<CustomTooltip selectedMonth={selectedMonth} />} />
          <Area
            type="monotone"
            dataKey="expense"
            name="Expense"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#colorExpense)"
            dot={false}
            activeDot={{ r: 5, fill: "#6366F1" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CashFlowChart;
