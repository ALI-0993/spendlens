import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { detectCategoryMatched, CATEGORY_COLORS } from '../../utils/categorize';
import { useTransactionStore } from '../../store/transactionStore';
import { type Transaction } from '../../types';





interface AddTransactionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

const AddTransactionPanel = ({ isOpen, onClose, editingTransaction }: AddTransactionPanelProps) => {
  // Form field state — all local to this component since nothing outside
  // needs to know what the user is typing mid-form, only the final result.
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{ merchant?: string; amount?: string; date?: string }>({});

const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);

  const isEditMode = !!editingTransaction;

  // Whenever the panel opens for editing a specific transaction, load its
  // values into the form. Whenever it opens fresh (editingTransaction is
  // null/undefined), this resets the form back to blank/today's date.
  useEffect(() => {
    if (isOpen && editingTransaction) {
      setMerchant(editingTransaction.merchant);
      setAmount(String(editingTransaction.amount));
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setErrors({});
    } else if (isOpen && !editingTransaction) {
      setMerchant('');
      setAmount('');
      setType('debit');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  }, [isOpen, editingTransaction]);

  // Auto-detected category, recalculated whenever merchant or type changes.
  // This is NOT separate state — it's derived directly from existing state,
  // so it can never get "out of sync" the way a separate useState could.
  const ruleResult = detectCategoryMatched(merchant, type);

  // AI category, only ever populated when the rule-based match above was
  // a genuine guess (matched: false) — no point spending an API call
  // re-confirming something the keyword list already knows for certain.
  const [aiCategory, setAiCategory] = useState<string | null>(null);
  const [aiCategoryLoading, setAiCategoryLoading] = useState(false);

  useEffect(() => {
    const trimmed = merchant.trim();

    // Reset whenever the rules already have a confident answer, or the
    // merchant name is too short to mean anything yet.
    if (ruleResult.matched || trimmed.length < 3) {
      setAiCategory(null);
      return;
    }

    // Debounce: wait 600ms after typing pauses before calling the AI, so
    // we're not firing a request on every single keystroke.
    const timer = setTimeout(() => {
      setAiCategoryLoading(true);
      fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant: trimmed, type }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          // Only trust the AI's answer if it's exactly one of our real
          // categories — anything else (typo, invented category, empty
          // response) is treated the same as a failure.
          if (data.category && CATEGORY_COLORS[data.category]) {
            setAiCategory(data.category);
          } else {
            setAiCategory(null);
          }
        })
        .catch(() => setAiCategory(null))
        .finally(() => setAiCategoryLoading(false));
    }, 600);

    return () => clearTimeout(timer);
  }, [merchant, type, ruleResult.matched]);

  // Final category shown and saved: AI's answer if we have one, otherwise
  // the rule-based guess — which is exactly what would've shown before
  // AI existed at all, so nothing gets worse if AI is unavailable.
  const detectedCategory = aiCategory ?? ruleResult.category;

  // Runs when "Add Transaction" is clicked. Validates the minimum required
  // fields, builds a full Transaction object, saves it to the store, then
  // resets the form and closes the panel — ready for the next entry.
  const handleSubmit = () => {
    const newErrors: { merchant?: string; amount?: string; date?: string } = {};
    const trimmedMerchant = merchant.trim();

    // Merchant — must be non-empty and contain at least one letter or number,
    // so spaces-only ("   ") or symbols-only ("@@@@") get rejected too.
    if (!trimmedMerchant) {
      newErrors.merchant = 'Merchant name is required';
    } else if (!/[a-zA-Z0-9]/.test(trimmedMerchant)) {
      newErrors.merchant = 'Enter a valid merchant name';
    }

    // Amount — Number('abc') silently returns NaN, and NaN <= 0 is false,
    // so a plain "<= 0" check alone would let non-numeric text slip through.
    // isNaN() catches that case explicitly.
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount)) {
      newErrors.amount = 'Enter a valid amount';
    } else if (numericAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Date — reject anything after today, since an expense/income can't
    // happen in the future. End of today (23:59:59) is used as the cutoff
    // so today's date itself is still valid.
    const selectedDate = new Date(date);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (!date || isNaN(selectedDate.getTime())) {
      newErrors.date = 'Enter a valid date';
    } else if (selectedDate > endOfToday) {
      newErrors.date = 'Date cannot be in the future';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (isEditMode && editingTransaction) {
      updateTransaction(editingTransaction.id, {
        date,
        description: trimmedMerchant,
        amount: numericAmount,
        type,
        category: detectedCategory,
        merchant: trimmedMerchant,
      });
    } else {
      addTransaction({
        id: crypto.randomUUID(),
        date,
        description: trimmedMerchant,
        amount: numericAmount,
        type,
        category: detectedCategory,
        merchant: trimmedMerchant,
      });
    }

    // Reset form for next entry
    setMerchant('');
    setAmount('');
    setType('debit');
    setDate(new Date().toISOString().split('T')[0]);
    setErrors({});

    onClose();
  };

  // When the panel is closed, render nothing at all. This is simpler than
  // hiding it with CSS, and avoids running any form logic when it's not visible.
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — covers the whole screen behind the panel, slightly
          darkens the page, and closes the panel if clicked */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Slide-in panel — fixed to the right edge of the screen */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — actual form fields, grouped into rows for better use of space */}
        <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
          {/* Merchant — full width */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Merchant
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => {
                setMerchant(e.target.value);
                if (errors.merchant) setErrors((prev) => ({ ...prev, merchant: undefined }));
              }}
              placeholder="e.g. Zomato, Uber, Amazon"
              className={`w-full mt-1.5 text-sm text-gray-800 border rounded-lg px-3 py-2.5 outline-none transition-colors ${
                errors.merchant
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-gray-200 focus:border-blue-400'
              }`}
            />
            {errors.merchant && (
              <p className="text-xs text-red-500 mt-1">{errors.merchant}</p>
            )}
          </div>

          {/* Amount + Date — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Amount
              </label>
              {/* Currency prefix sits inside the input via relative positioning,
                  and [appearance:textfield] removes the browser's number
                  spinner arrows, which looked cheap in the earlier version */}
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  placeholder="0"
                  className={`w-full text-sm text-gray-800 border rounded-lg pl-7 pr-3 py-2.5 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    errors.amount
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-200 focus:border-blue-400'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>  

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full mt-1.5 text-sm text-gray-800 border rounded-lg px-3 py-2.5 outline-none transition-colors ${
                  errors.date
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-gray-200 focus:border-blue-400'
                }`}
              />
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Type — full width segmented control */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Type
            </label>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setType('debit')}
                className="flex-1 text-sm font-semibold py-2.5 rounded-lg border-2 transition-colors"
                style={
                  type === 'debit'
                    ? { backgroundColor: '#EF444415', color: '#EF4444', borderColor: '#EF4444' }
                    : { backgroundColor: 'white', color: '#9CA3AF', borderColor: '#E5E7EB' }
                }
              >
                Debit (Expense)
              </button>
              <button
                type="button"
                onClick={() => setType('credit')}
                className="flex-1 text-sm font-semibold py-2.5 rounded-lg border-2 transition-colors"
                style={
                  type === 'credit'
                    ? { backgroundColor: '#16A34A15', color: '#16A34A', borderColor: '#16A34A' }
                    : { backgroundColor: 'white', color: '#9CA3AF', borderColor: '#E5E7EB' }
                }
              >
                Credit (Income)
              </button>
            </div>
          </div>

          {/* Category — auto-detected, shown as a read-only badge preview.
              Not yet manually editable; that's a reasonable future upgrade
              but adds dropdown-override complexity we don't need on day one. */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Category{' '}
              <span className="text-gray-300 font-normal">
                {aiCategoryLoading ? '(checking with AI...)' : aiCategory ? '(AI-detected)' : '(auto-detected)'}
              </span>
            </label>
            <div className="mt-1.5">
              <span
                className="inline-block text-sm font-semibold px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[detectedCategory] || '#6b7280'}25`,
                  color: CATEGORY_COLORS[detectedCategory] || '#6b7280',
                }}
              >
                {detectedCategory}
              </span>
            </div>
          </div>
        </div>

        {/* Footer — sticky action buttons, always visible even if the
            form content above grows or scrolls */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 text-sm font-semibold text-white rounded-lg py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] cursor-pointer transition-colors"
          >
            {isEditMode ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddTransactionPanel;