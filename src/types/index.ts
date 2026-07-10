export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  merchant: string;
}

export interface MonthlyStats {
  totalSpent: number;
  totalIncome: number;
  totalSaved: number;
  topCategory: string;
}

export type Category =
  | 'Food & Dining'
  | 'Shopping'
  | 'Transport'
  | 'Bills & Utilities'
  | 'Entertainment'
  | 'Income'
  | 'Others'
  | 'Transfers';