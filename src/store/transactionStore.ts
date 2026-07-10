import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Transaction } from '../types';

interface TransactionStore {
  transactions: Transaction[];
  selectedMonth: string; // format: 'YYYY-MM'
  setTransactions: (txns: Transaction[]) => void;
  setSelectedMonth: (month: string) => void;    
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      transactions: [],
      selectedMonth: '2025-05',
      setTransactions: (txns) => set({ transactions: txns }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
    }),
    {
      // Key under which this store's data is saved in the browser's
      // localStorage — visible in DevTools under Application > Local Storage.
      name: 'spendlens-transactions',
    }
  )
);