import type { Category } from '../types';

// Keyword → category lookup, organized by category so it's easy to scan
// and extend. Each category lists the lowercase substrings that should
// match it. Checked with .includes(), so partial typing or longer real
// merchant strings (e.g. a UPI handle like "playstore@axisbank") still
// match correctly.
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'Food & Dining': ['zomato', 'swiggy', 'blinkit', 'dmart'],
  'Shopping': ['amazon', 'myntra'],
  'Transport': ['ola', 'uber', 'rapido', 'ixigo'],
  'Bills & Utilities': ['airtel', 'jio', 'bses', 'gpayrecharge', 'recharge'],
  'Entertainment': ['netflix', 'spotify', 'playstore'],
  'Others': ['pharmeasy'],
  'Income': ['salary', 'client'],
  // UPI-specific: most P2P UPI payments (paying a person directly, not a
  // business) don't have a recognizable merchant name at all — the
  // handle is just someone's personal UPI ID. These generic payment-app
  // suffixes are the closest signal we have that something is a transfer
  // rather than a business transaction.
  'Transfers': ['paytm', 'okaxi', 'okhdfc', 'oksbi', 'okicici', 'ybl', 'paytmqr'],
};

// Flips CATEGORY_KEYWORDS into a single keyword -> category map for fast
// lookup, built once when this module loads rather than on every call.
const buildKeywordIndex = (): Record<string, Category> => {
  const index: Record<string, Category> = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    for (const keyword of keywords) {
      index[keyword] = category;
    }
  }
  return index;
};

const KEYWORD_INDEX = buildKeywordIndex();

// Looks at the merchant name and returns the best-guess category.
// Falls back to 'Income' if type is credit (since most income sources
// won't be in the merchant map), or 'Others' for unrecognized debits.
export const detectCategory = (merchant: string, type: 'debit' | 'credit'): Category => {
  return detectCategoryMatched(merchant, type).category;
};

// Same lookup as detectCategory, but also reports whether this was a real
// keyword match or just the generic fallback guess. AddTransactionPanel
// uses `matched` to decide whether it's worth calling the AI at all —
// no point spending an API call re-guessing something the rules already
// know for certain (e.g. "zomato" -> Food & Dining, instantly, for free).
export const detectCategoryMatched = (
  merchant: string,
  type: 'debit' | 'credit'
): { category: Category; matched: boolean } => {
  const lower = merchant.toLowerCase();
  const matchedKeyword = Object.keys(KEYWORD_INDEX).find((keyword) => lower.includes(keyword));
  if (matchedKeyword) return { category: KEYWORD_INDEX[matchedKeyword], matched: true };
  // An unrecognized credit is more often a P2P repayment or refund than
  // confirmed income (e.g. a friend paying back ₹2,000 via UPI shows up
  // identically to a real income deposit unless the source is a known
  // employer/client keyword). Defaulting to 'Transfers' is the more
  // honest guess — it doesn't inflate income with money that was never
  // really earned.
  return { category: type === 'credit' ? 'Transfers' : 'Others', matched: false };
};

// Single source of truth for category colors, used by RecentTransactions,
// AddTransactionPanel, CategoryChart, and InsightsPage — previously
// duplicated across each of those files separately.
export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#10B981',
  'Shopping': '#6366F1',
  'Transport': '#F59E0B',
  'Bills & Utilities': '#3B82F6',
  'Entertainment': '#EF4444',
  'Others': '#8B5CF6',
  'Income': '#16A34A',
  'Transfers': '#0EA5E9',
};