import { useState, useEffect } from 'react';
   import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
   import AddTransactionPanel from '../components/transactions/AddTransactionPanel';
import { useTransactionStore } from '../store/transactionStore';
import { formatINR } from '../utils/calculations';
import { type Transaction } from '../types';

// Same color map as RecentTransactions.tsx — keeping it identical
// across pages is what makes the app feel like one consistent product,
// instead of every page inventing its own colors.
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#10B981',
  'Shopping': '#6366F1',
  'Transport': '#F59E0B',
  'Bills & Utilities': '#3B82F6',
  'Entertainment': '#EF4444',
  'Others': '#8B5CF6',
  'Income': '#16A34A',
  'Transfers': '#0EA5E9',
};

// Shared Tailwind classes for every dropdown, so they all look identical
// without repeating the same long string 4 times.
const SELECT_CLASSES =
  'text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-gray-300 focus:border-blue-400 transition-colors';

const TransactionsPage = () => {
  const { transactions } = useTransactionStore();

  // Filter state — each of these is now controlled by a dropdown/input below.
  // Logic that actually USES these to filter the table comes in the next step.
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
     const [isPanelOpen, setIsPanelOpen] = useState(false);
     const [openMenuId, setOpenMenuId] = useState<string | null>(null);
     const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
     const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Closes the open row's action menu when the user clicks anywhere outside
  // it, or scrolls the page. The [data-txn-row] check lets clicks on the
  // row itself (or its menu, since the menu lives inside the row) pass
  // through without immediately closing what was just opened.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-txn-row]')) {
        setOpenMenuId(null);
      }
    };
    const handleScroll = () => setOpenMenuId(null);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Resets every filter back to its default value.
  // Used by the "Clear Filters" link.
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedMonth('All');
    setSelectedType('All');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Build the filtered list step by step. Each .filter() call narrows
  // down the list further based on one piece of filter state.
  // Order doesn't matter here since each filter is independent —
  // we're just checking different fields on the same transaction.
  const filteredTransactions = transactions
    .filter((txn) => {
      // Search filter — case-insensitive match against merchant name.
      // If searchQuery is empty, this always returns true (no filtering).
      if (!searchQuery) return true;
      return txn.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .filter((txn) => {
      // Category filter
      if (selectedCategory === 'All') return true;
      return txn.category === selectedCategory;
    })
    .filter((txn) => {
      // Month filter — txn.date looks like '2025-05-04', so startsWith
      // checks if it begins with '2025-05'
      if (selectedMonth === 'All') return true;
      return txn.date.startsWith(selectedMonth);
    })
    .filter((txn) => {
      // Type filter — selectedType is either 'All', 'credit', or 'debit'
      if (selectedType === 'All') return true;
      return txn.type === selectedType;
    })
    .sort((a, b) => {
      // 'newest'/'oldest' compare dates as actual Date objects, not strings,
      // so they sort chronologically rather than alphabetically.
      if (sortBy === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'highest') {
        return b.amount - a.amount;
      }
      if (sortBy === 'lowest') {
        return a.amount - b.amount;
      }
      return 0; // fallback — no sorting applied
    });

  // Pagination — slice the filtered+sorted list into pages of 10
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  // Guard against being stuck on a page that no longer exists — e.g. you're
  // on page 3, then a filter shrinks results down to 1 page. Without this,
  // currentPage would stay 3 and the table would render empty.
  const safePage = Math.min(currentPage, totalPages) || 1;
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Builds a shortened page number list like [1, '...', 4, 5, 6, '...', 19]
  // instead of showing every single page. Always keeps the first page,
  // the last page, and a small window of 1 page on either side of
  // wherever the user currently is — with '...' filling any gap bigger
  // than that, so clicking through a huge dataset never means scanning
  // past 15+ buttons.
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push('...');

    pages.push(total);

    return pages;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Transactions</h1>
          <p className="text-text-muted mt-1 text-sm">
            View and manage all your transactions
          </p>
        </div>
        <button
           onClick={() => {
             setEditingTransaction(null);
             setIsPanelOpen(true);
           }}
           className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] cursor-pointer transition-colors"
         >
           <Plus size={16} />
           Add Transaction
         </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 px-5 py-4 mb-4 flex items-center gap-3">
        {/* Search — given flex-1 so it takes up the most space, per the design */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by merchant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Category dropdown — options generated from CATEGORY_COLORS keys
            so we never have to maintain this list in two places */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={SELECT_CLASSES}
        >
          <option value="All">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Month dropdown — hardcoded to the 2 months currently in sample
            data. TODO: once real CSV upload exists (Phase 2), generate
            this list dynamically from the actual months present in
            transactions, instead of hardcoding May/April. */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={SELECT_CLASSES}
        >
          <option value="All">All Months</option>
          <option value="2025-05">May 2025</option>
          <option value="2025-04">April 2025</option>
        </select>

        {/* Type dropdown */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={SELECT_CLASSES}
        >
          <option value="All">All Types</option>
          <option value="credit">Income</option>
          <option value="debit">Expense</option>
        </select>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={SELECT_CLASSES}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>

        {/* Clear Filters */}
        <button
          onClick={handleClearFilters}
          className="text-sm font-semibold text-gray-500 hover:text-blue-600 cursor-pointer transition-colors whitespace-nowrap"
        >
          Clear Filters
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        {/* Table header row */}
        <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Merchant</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Amount</span>
        </div>

        {/* Rows — showing ALL transactions for now, no filtering/sorting/pagination yet */}
        {paginatedTransactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No transactions found
          </div>
        ) : (
          paginatedTransactions.map((txn) => (
            <div
              key={txn.id}
              data-txn-row
              onClick={() => setOpenMenuId((prev) => (prev === txn.id ? null : txn.id))}
              className="relative grid grid-cols-5 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
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

              {/* Category badge */}
              <div className="self-center">
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[txn.category]}25`,
                    color: CATEGORY_COLORS[txn.category] || '#6b7280',
                  }}
                >
                  {txn.category}
                </span>
              </div>

              {/* Date */}
              <span className="text-sm text-gray-500 self-center">{formatDate(txn.date)}</span>

              {/* Type — styled as a badge now, matching the category chip's
                  design language (soft tinted background + bold text) */}
              <div className="self-center">
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: txn.type === 'credit' ? '#16A34A25' : '#EF444425',
                    color: txn.type === 'credit' ? '#16A34A' : '#EF4444',
                  }}
                >
                  {txn.type === 'credit' ? 'Credit' : 'Debit'}
                </span>
              </div>

              {/* Amount */}
              <span
                className="text-sm font-bold self-center text-right"
                style={{ color: txn.type === 'credit' ? '#16A34A' : '#EF4444' }}
              >
                {txn.type === 'credit' ? '+' : '-'}{formatINR(txn.amount)}
              </span>

              {/* Edit/Delete dropdown — only rendered for the active row.
                  stopPropagation keeps clicks inside it from bubbling up to
                  the row's onClick, which would otherwise immediately
                  toggle the menu closed again. */}
              {openMenuId === txn.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-5 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setEditingTransaction(txn);
                      setIsPanelOpen(true);
                      setOpenMenuId(null);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      deleteTransaction(txn.id);
                      setOpenMenuId(null);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
          <span className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {getPageNumbers(safePage, totalPages).map((page, i) =>
              page === '...' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="text-sm w-8 h-8 flex items-center justify-center text-gray-400"
                >
                  ···
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className="text-sm w-8 h-8 rounded-lg cursor-pointer transition-colors"
                  style={
                    page === safePage
                      ? { backgroundColor: '#3B82F6', color: 'white' }
                      : { backgroundColor: '#F3F4F6', color: '#6b7280' }
                  }
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    <AddTransactionPanel
           isOpen={isPanelOpen}
           onClose={() => {
             setIsPanelOpen(false);
             setEditingTransaction(null);
           }}
           editingTransaction={editingTransaction}
         />
       </div>
     );
   };


   export default TransactionsPage;