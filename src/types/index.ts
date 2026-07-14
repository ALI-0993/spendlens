export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: Category;
  merchant: string;
  sourceFile?: string; // id of the UploadedFile this transaction came from, if any
}

export interface UploadedFile {
  id: string;
  name: string;
  uploadedAt: string; // ISO timestamp
  transactionCount: number;
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