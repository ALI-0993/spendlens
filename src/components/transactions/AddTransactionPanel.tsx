import { useState } from 'react';
import { X } from 'lucide-react';
import { detectCategory, CATEGORY_COLORS } from '../../utils/categorize';





interface AddTransactionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTransactionPanel = ({ isOpen, onClose }: AddTransactionPanelProps) => {
  // Form field state — all local to this component since nothing outside
  // needs to know what the user is typing mid-form, only the final result.
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Auto-detected category, recalculated whenever merchant or type changes.
  // This is NOT separate state — it's derived directly from existing state,
  // so it can never get "out of sync" the way a separate useState could.
  const detectedCategory = detectCategory(merchant, type);
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
          <h2 className="text-lg font-bold text-gray-900">Add Transaction</h2>
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
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Zomato, Uber, Amazon"
              className="w-full mt-1.5 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 transition-colors"
            />
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
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 outline-none focus:border-blue-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1.5 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 transition-colors"
              />
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
              Category <span className="text-gray-300 font-normal">(auto-detected)</span>
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
            className="flex-1 text-sm font-semibold text-white rounded-lg py-2.5 transition-colors"
            style={{ backgroundColor: '#3B82F6' }}
          >
            Add Transaction
          </button>
        </div>
      </div>
    </>
  );
};

export default AddTransactionPanel;