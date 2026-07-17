import { CreditCard, Wallet, PiggyBank, UtensilsCrossed } from "lucide-react";
import SummaryCard from "../components/dashboard/SummaryCard";
import MonthSelector from "../components/dashboard/MonthSelector";
import { useTransactionStore } from "../store/transactionStore";
import { getMonthlyStats, formatINR } from "../utils/calculations";
import CashFlowChart from "../components/dashboard/CashFlowChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import AIInsights from "../components/dashboard/AIInsights";

const DashboardPage = () => {
  const { transactions, selectedMonth } = useTransactionStore();
  const stats = getMonthlyStats(transactions, selectedMonth);

  const cards = [
    {
      title: "Total Spent",
      value: formatINR(stats.totalSpent),
      subtitle: "",
      change: stats.spentChange,
      previousMonthLabel: stats.previousMonthLabel,
      hasPreviousMonthData: stats.hasPreviousMonthData,
      positiveIsGood: false, // spending MORE is a bad thing
      icon: CreditCard,
      iconBg: "#FEE2E2",
      accentColor: "#EF4444",
    },
    {
      title: "Income",
      value: formatINR(stats.totalIncome),
      subtitle: "",
      change: stats.incomeChange,
      previousMonthLabel: stats.previousMonthLabel,
      hasPreviousMonthData: stats.hasPreviousMonthData,
      positiveIsGood: true, // earning MORE is a good thing
      icon: Wallet,
      iconBg: "#DCFCE7",
      accentColor: "#16A34A",
    },
    {
      title: "Saved",
      value: formatINR(stats.totalSaved),
      subtitle: "",
      differenceAmount: stats.savedDifference,
      previousMonthLabel: stats.previousMonthLabel,
      hasPreviousMonthData: stats.hasPreviousMonthData,
      positiveIsGood: true, // saving MORE is a good thing
      icon: PiggyBank,
      iconBg: "#DBEAFE",
      accentColor: "#2563EB",
    },
    {
      title: "Top Category",
      value: stats.topCategory,
      subtitle: "Highest spend category this month",
      icon: UtensilsCrossed,
      iconBg: "#FEF9C3",
      accentColor: "#CA8A04",
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard</h1>
          <p className="text-text-muted mt-1 text-sm">
            Track your monthly spending and financial habits
          </p>
        </div>
        <MonthSelector />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <CashFlowChart />
        <CategoryChart />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6 items-stretch">
        <div className="col-span-2">
          <RecentTransactions />
        </div>
        <AIInsights />
      </div>
    </div>
  );
};

export default DashboardPage;
