import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  change?: number; // percentage change from last month
  icon: LucideIcon;
  iconBg: string;
  accentColor: string;
}

const SummaryCard = ({ title, value, subtitle, change, icon: Icon, iconBg, accentColor }: SummaryCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">

      {/* Top row — icon + change badge */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        {hasChange && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          }`}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isPositive ? '+' : ''}{change}%
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>

      {/* Accent line + subtitle */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1 w-12 rounded-full" style={{ backgroundColor: accentColor }} />
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>

    </div>
  );
};

export default SummaryCard;