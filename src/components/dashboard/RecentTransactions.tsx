import { useTransactionStore } from '../../store/transactionStore';
import { formatINR } from '../../utils/calculations';
import { CATEGORY_COLORS } from '../../utils/categorize';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';


const RecentTransactions = () => {
  const { transactions, selectedMonth } = useTransactionStore();
  const navigate = useNavigate();

  const recent = useMemo(() => {
  return [...transactions]
    .filter((t) => t.date.startsWith(selectedMonth))
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, 5);
}, [transactions, selectedMonth]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 ">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
        <button
          onClick={() => navigate('/transactions')}
          className="text-xs font-semibold"
          style={{ color: '#0d9488' }}
        >
          View All
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-4 px-5 py-2.5 border-b border-gray-50">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Merchant</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Amount</span>
      </div>

      {/* Rows */}
{recent.length === 0 ? (
  <div className="py-10 text-center text-sm text-gray-500">
    No transactions found for this month
  </div>
) : (
  recent.map((txn) => (
        <div
          key={txn.id}
          className="grid grid-cols-4 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors"
        >
          {/* Merchant */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[txn.category] || '#6b7280' }}
            >
              {txn.merchant.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800 truncate">{txn.merchant}</span>
          </div>

          {/* Date */}
          <span className="text-sm text-gray-500 self-center">{formatDate(txn.date)}</span>

          {/* Category badge */}
          <div className="self-center">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${CATEGORY_COLORS[txn.category]}18`,
                color: CATEGORY_COLORS[txn.category] || '#6b7280',
              }}
            >
              {txn.category}
            </span>
          </div>

          {/* Amount */}
          <span
            className="text-sm font-bold self-center text-right"
            style={{ color: txn.type === 'credit' ? '#16A34A' : '#EF4444' }}
          >
            {txn.type === 'credit' ? '+' : '-'}{formatINR(txn.amount)}
          </span>
        </div>
      )))}
    </div>
  );
};

export default RecentTransactions;