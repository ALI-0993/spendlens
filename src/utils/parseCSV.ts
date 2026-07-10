import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { type Transaction } from '../types';
import { detectCategory } from './categorize';

// One raw row, as Papa Parse gives it to us — every value is a string,
// since CSV files have no concept of "this column is a number".
// We support a few common column-name variants so this isn't locked
// to one single bank's export format.
// CSV values always arrive as strings. Excel cells can arrive as strings,
// numbers, or Date objects — so this type is shared by both readers and
// has to allow for that. cellToString() below normalizes whichever one
// we actually get.
type CellValue = string | number | Date | undefined;

interface RawRow {
  Date?: CellValue;
  date?: CellValue;
  Description?: CellValue;
  Narration?: CellValue;
  Particulars?: CellValue;
  description?: CellValue;
  Amount?: CellValue;
  amount?: CellValue;
  Debit?: CellValue;
  Credit?: CellValue;
  'Withdrawal Amt.'?: CellValue;
  'Deposit Amt.'?: CellValue;
  Type?: CellValue;
  type?: CellValue;
}

// Tries each known column-name variant in order, returns the first
// non-empty one found. This is what lets the same function survive
// slightly different CSV headers without us rewriting it per bank.
// Turns any cell value (string, number, or Date) into a trimmed string.
// Excel dates need special handling — toISOString() gives us the
// YYYY-MM-DD part directly without timezone-related date-shifting issues
// that toLocaleDateString() can introduce.
const cellToString = (value: CellValue): string => {
  if (value === undefined) return '';
  if (value instanceof Date) {
    // Read the LOCAL year/month/day directly instead of going through
    // toISOString(), which converts to UTC first and can shift the date
    // backward by a day for any timezone ahead of UTC (like IST, UTC+5:30).
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
};

const pick = (row: RawRow, keys: (keyof RawRow)[]): string => {
  for (const key of keys) {
    const str = cellToString(row[key]);
    if (str !== '') return str;
  }
  return '';
};

// Strips ₹, commas, and stray whitespace so "₹1,234.50" becomes a
// number JavaScript can actually do math with.
const cleanAmount = (raw: string): number => {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  return parseFloat(cleaned);
};

// Takes one raw row (from either Papa Parse or SheetJS) and turns it into
// a Transaction, or returns null if the row doesn't have enough usable
// data. This is the one place that knows how to interpret a row — both
// the CSV reader and the Excel reader call this, so they can never
// disagree on what counts as a valid transaction.
const buildTransactionFromRow = (row: RawRow): Transaction | null => {
  const date = pick(row, ['Date', 'date']);
  const description = pick(row, ['Description', 'Narration', 'Particulars', 'description']);

  // Figure out amount + type. Some banks give one signed "Amount" column;
  // others split it into separate Debit/Credit columns. We check the
  // split-column case first since it's unambiguous.
  const debitRaw = pick(row, ['Debit', 'Withdrawal Amt.']);
  const creditRaw = pick(row, ['Credit', 'Deposit Amt.']);
  const amountRaw = pick(row, ['Amount', 'amount']);

  let amount: number;
  let type: 'debit' | 'credit';

  if (debitRaw || creditRaw) {
    if (debitRaw) {
      amount = cleanAmount(debitRaw);
      type = 'debit';
    } else {
      amount = cleanAmount(creditRaw);
      type = 'credit';
    }
  } else {
    const parsed = cleanAmount(amountRaw);
    type = parsed < 0 ? 'debit' : 'credit';
    amount = Math.abs(parsed);
  }

  // If we couldn't get a usable date, description, or amount,
  // this row is unusable — the caller will count it as skipped.
  if (!date || !description || isNaN(amount) || amount === 0) {
    return null;
  }

  const merchant = description;
  const category = detectCategory(merchant, type);

  return {
    id: crypto.randomUUID(),
    date,
    description,
    amount,
    type,
    category,
    merchant,
  };
};

export interface ParseResult {
  transactions: Transaction[];
  skippedCount: number;
}

// Takes a raw CSV File object (from an <input type="file">) and resolves
// to clean Transaction objects, ready to hand to setTransactions().
export const parseCSVFile = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: Transaction[] = [];
        let skippedCount = 0;

        for (const row of results.data) {
          const transaction = buildTransactionFromRow(row);
          if (transaction) {
            transactions.push(transaction);
          } else {
            skippedCount++;
          }
        }

        resolve({ transactions, skippedCount });
      },
      error: (error) => reject(error),
    });
  });
};

// Words that, if found in a row, mark it as the real header row — as
// opposed to a title/account-info row above it (which real bank exports
// sometimes have, like the sample file's "ABC Super Fund" first line).
const HEADER_INDICATOR_WORDS = ['date', 'description', 'narration', 'particulars', 'debit', 'credit', 'amount'];

// Scans the first 10 rows of a sheet looking for the one that contains
// recognizable column names. Returns its index, or -1 if none found.
const findHeaderRowIndex = (rows: unknown[][]): number => {
  const searchLimit = Math.min(rows.length, 10);
  for (let i = 0; i < searchLimit; i++) {
    const row = rows[i];
    const rowText = row.map((cell) => String(cell ?? '').toLowerCase()).join(' ');
    const matchCount = HEADER_INDICATOR_WORDS.filter((word) => rowText.includes(word)).length;
    // Require at least 2 matching words, so a row that just happens to
    // contain the word "date" somewhere in a title isn't mistaken for headers.
    if (matchCount >= 2) return i;
  }
  return -1;
};

export const parseExcelFile = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        // cellDates: true makes SheetJS hand us real Date objects for date
        // cells instead of Excel's internal serial-number representation,
        // which is what lets cellToString() handle dates the same way
        // everywhere else in this file.
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        // header: 1 gives us a raw array-of-arrays instead of guessing
        // which row is the header — we do that ourselves, since real
        // files (like the sample one) put junk rows before the real headers.
        const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIndex = findHeaderRowIndex(allRows);
        if (headerRowIndex === -1) {
          resolve({ transactions: [], skippedCount: 0 });
          return;
        }

        const headers = allRows[headerRowIndex].map((cell) => String(cell ?? '').trim());
        const dataRows = allRows.slice(headerRowIndex + 1);

        const transactions: Transaction[] = [];
        let skippedCount = 0;

        for (const rawRow of dataRows) {
          // Skip fully blank rows (common as trailing rows in real exports)
          if (rawRow.every((cell) => cell === undefined || cell === '')) continue;

          // Rebuild this row as a { Date: ..., Description: ... } object,
          // matching headers to cells by position — exactly the shape
          // buildTransactionFromRow already knows how to read.
          const rowObject: RawRow = {};
          headers.forEach((header, index) => {
            (rowObject as Record<string, CellValue>)[header] = rawRow[index] as CellValue;
          });

          const transaction = buildTransactionFromRow(rowObject);
          if (transaction) {
            transactions.push(transaction);
          } else {
            skippedCount++;
          }
        }

        resolve({ transactions, skippedCount });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};