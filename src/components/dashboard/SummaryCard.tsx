import { type LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { formatINR } from '../../utils/calculations';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string; // fallback text for cards with no comparison at all (e.g. Top Category)
  change?: number; // percentage change — used for Total Spent / Income
  differenceAmount?: number; // rupee difference — used for Saved/Net Balance instead of a %
  previousMonthLabel?: string; // e.g. "Apr 2026", so text reads "higher than Apr 2026" instead of a vague "last month"
  hasPreviousMonthData?: boolean;
  // Whether an INCREASE in this metric is a good thing. true for Income
  // and Saved (more is better), false for Total Spent (more is worse).
  // This is what decides whether an upward arrow gets colored green or red.
  positiveIsGood?: boolean;
  icon: LucideIcon;
  iconBg: string;
  accentColor: string;
}

const SummaryCard = ({
  title,
  value,
  subtitle,
  change,
  differenceAmount,
  previousMonthLabel,
  hasPreviousMonthData,
  positiveIsGood = true,
  icon: Icon,
  iconBg,
  accentColor,
}: SummaryCardProps) => {
  const hasPercentChange = change !== undefined;
  const hasDifference = differenceAmount !== undefined;

  let changeText = subtitle;
  let ArrowIcon: LucideIcon | null = null;
  let changeColor = '#9CA3AF'; // neutral gray by default

  if (hasPercentChange || hasDifference) {
    if (hasPreviousMonthData === false) {
      changeText = 'No previous month data';
    } else if (hasDifference) {
      if (differenceAmount === 0) {
        changeText = `No change from ${previousMonthLabel}`;
      } else {
        const isHigher = differenceAmount! > 0;
        const isGood = positiveIsGood ? isHigher : !isHigher;
        ArrowIcon = isHigher ? ArrowUp : ArrowDown;
        changeColor = isGood ? '#16A34A' : '#EF4444';
        changeText = `${formatINR(Math.abs(differenceAmount!))} ${isHigher ? 'higher' : 'lower'} than ${previousMonthLabel}`;
      }
    } else if (hasPercentChange) {
      if (change === 0) {
        changeText = `No change from ${previousMonthLabel}`;
      } else {
        const isHigher = change! > 0;
        const isGood = positiveIsGood ? isHigher : !isHigher;
        ArrowIcon = isHigher ? ArrowUp : ArrowDown;
        changeColor = isGood ? '#16A34A' : '#EF4444';
        const magnitude = Math.abs(change!) > 100 ? '100%+' : `${Math.abs(change)}%`;
        changeText = `${magnitude} ${isHigher ? 'higher' : 'lower'} than ${previousMonthLabel}`;
      }
    }
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">

      {/* Top row — icon only */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon size={20} style={{ color: accentColor }} />
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>

      {/* Accent line + comparison text, with a dynamic direction arrow
          when there's a real comparison to show */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1 w-12 rounded-full" style={{ backgroundColor: accentColor }} />
        <div className="flex items-center gap-1">
          {ArrowIcon && <ArrowIcon size={12} style={{ color: changeColor }} />}
          <p className="text-xs" style={{ color: ArrowIcon ? changeColor : '#9CA3AF' }}>
            {changeText}
          </p>
        </div>
      </div>

    </div>
  );
};

export default SummaryCard;