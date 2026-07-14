import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTransactionStore } from '../../store/transactionStore';
import { getRecentMonths, formatMonthLabel } from '../../utils/calculations';

// A dropdown that lists every month with real transaction data (newest
// first), and lets the user switch which month the whole Dashboard is
// looking at. Since selectedMonth lives in the shared Zustand store,
// every chart on the page (CashFlowChart, CategoryChart, AIInsights,
// RecentTransactions) reads from the same value — so picking a month
// here updates all of them at once, with no extra wiring needed.
const MonthSelector = () => {
  const { transactions, selectedMonth, setSelectedMonth } = useTransactionStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only months that actually have at least one transaction — no point
  // offering an empty month to switch to.
  const availableMonths = getRecentMonths(transactions, 12);

  // Close the dropdown on any click outside it, same pattern used for
  // the Transactions page row menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Nothing to select yet — no transactions uploaded at all.
  if (availableMonths.length === 0) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3.5 py-2 cursor-pointer hover:border-gray-300 transition-colors"
      >
        Viewing: {formatMonthLabel(selectedMonth)}
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
          {availableMonths.map((month) => (
            <button
              key={month}
              type="button"
              onClick={() => {
                setSelectedMonth(month);
                setIsOpen(false);
              }}
              className={`w-full text-left text-sm px-4 py-2.5 cursor-pointer transition-colors ${
                month === selectedMonth
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {formatMonthLabel(month)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthSelector;