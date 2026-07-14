import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Transaction, type UploadedFile } from '../types';

interface TransactionStore {
  transactions: Transaction[];
  selectedMonth: string; // format: 'YYYY-MM'
  uploadedFiles: UploadedFile[];
  setTransactions: (txns: Transaction[]) => void;
  addTransaction: (txn: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setSelectedMonth: (month: string) => void;
  addUploadedFile: (file: UploadedFile) => void;
  deleteUploadedFile: (fileId: string) => void;
}

const getCurrentMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      transactions: [],
      selectedMonth: getCurrentMonth(),
      uploadedFiles: [],
      setTransactions: (txns) => set({ transactions: txns }),
      addTransaction: (txn) =>
        set((state) => ({ transactions: [txn, ...state.transactions] })),
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      addUploadedFile: (file) =>
        set((state) => ({ uploadedFiles: [file, ...state.uploadedFiles] })),
      // Deleting a file removes its entry from the list AND every
      // transaction tagged with that file's id — this is what makes
      // delete actually undo the upload, not just hide it from a list.
      deleteUploadedFile: (fileId) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
          transactions: state.transactions.filter((t) => t.sourceFile !== fileId),
        })),
    }),
    {
      // Key under which this store's data is saved in the browser's
      // localStorage — visible in DevTools under Application > Local Storage.
      name: 'spendlens-transactions',
    }
  )
);