import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { type Transaction } from '../types';
import { detectCategoryMatched } from './categorize';
import { applyAICategorization } from './parseCSV';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Matches "01 May, 2026" — the date format Google Pay statements use to
// mark the start of each transaction block.
const DATE_PATTERN = /^\d{1,2} \w+, \d{4}$/;
// Matches "10:30 PM" — always the line right after the date.
const TIME_PATTERN = /^\d{1,2}:\d{2} (AM|PM)$/;
// Matches "₹90" or "₹6,031.10" — the amount that closes out a transaction block.
const AMOUNT_PATTERN = /^₹[\d,]+(\.\d+)?$/;

const MONTH_NUMBERS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

// Converts "01 May, 2026" into "2026-05-01", matching the date format
// used everywhere else in the app.
const convertDate = (dateStr: string): string => {
  const [day, monthName, year] = dateStr.replace(',', '').split(' ');
  const month = MONTH_NUMBERS[monthName];
  return `${year}-${month}-${day.padStart(2, '0')}`;
};

export interface ParseResult {
  transactions: Transaction[];
  skippedCount: number;
}

// Quick check used by the format-detection step in parsePDF.ts — does
// this page's text look like a Google Pay statement? Checked against
// distinctive header text that's always present on page 1, regardless
// of how the file was renamed.
export const looksLikeGooglePayStatement = (pageText: string): boolean => {
  return pageText.includes('Transaction statement') && pageText.includes('Google Pay');
};

export const parseGooglePayFile = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const transactions: Transaction[] = [];
  const unmatchedIndices: number[] = [];
  let skippedCount = 0;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // Unlike the Bank of Baroda PDF, Google Pay statements emit text
    // items in correct top-to-bottom reading order already — confirmed
    // by testing, where a straightforward sequential scan reproduced
    // the statement's own stated Sent/Received totals exactly. No
    // position-based reconstruction needed here.
    const items = (content.items as { str: string }[])
      .map((item) => item.str.trim())
      .filter((s) => s !== '');

    let i = 0;
    while (i < items.length) {
      if (!DATE_PATTERN.test(items[i])) {
        i++;
        continue;
      }

      const dateStr = items[i];
      const timeStr = items[i + 1];
      const actionLine = items[i + 2]; // "Paid to X" or "Received from X"

      // The amount is a few items further along — skip over the
      // "UPI Transaction ID: ..." and "Paid by/to ... 3888" lines
      // to find it, stopping early if we hit the next date instead
      // (which would mean this block has no amount, an unusual case).
      let j = i + 3;
      let amountStr: string | null = null;
      while (j < items.length && j < i + 8) {
        if (AMOUNT_PATTERN.test(items[j])) {
          amountStr = items[j];
          break;
        }
        if (DATE_PATTERN.test(items[j])) break;
        j++;
      }

      const isValidBlock =
        TIME_PATTERN.test(timeStr) &&
        !!actionLine &&
        (actionLine.startsWith('Paid to') || actionLine.startsWith('Received from')) &&
        !!amountStr;

      if (!isValidBlock) {
        skippedCount++;
        i++;
        continue;
      }

      const isReceived = actionLine.startsWith('Received from');
      const merchant = actionLine.replace(/^(Paid to|Received from)\s+/, '').trim();
      const amount = parseFloat(amountStr!.replace(/[₹,]/g, ''));
      const type: 'debit' | 'credit' = isReceived ? 'credit' : 'debit';
      const date = convertDate(dateStr);
      const { category, matched } = detectCategoryMatched(merchant, type);

      transactions.push({
        id: crypto.randomUUID(),
        date,
        description: actionLine,
        amount,
        type,
        category,
        merchant,
      });
      if (!matched) unmatchedIndices.push(transactions.length - 1);

      i = j + 1; // move past the amount we just consumed
    }
  }

  if (unmatchedIndices.length > 0) {
    await applyAICategorization(transactions, unmatchedIndices);
  }

  return { transactions, skippedCount };
};