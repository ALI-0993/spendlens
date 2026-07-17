import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { type Transaction } from '../types';
import { detectCategoryMatched } from './categorize';
import { looksLikeGooglePayStatement, parseGooglePayFile } from './parseGooglePay';
import { applyAICategorization } from './parseCSV';

// pdf.js does its parsing work in a background worker thread, and needs
// to be told where to load that worker script from. Vite's `?url` import
// gives us the correct bundled URL automatically.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextCell {
  x: number;
  str: string;
}

interface TextRow {
  cells: TextCell[];
}

// Groups a page's raw text items by Y position (rounded, since items on
// the same visual line can have tiny floating-point Y differences), then
// sorts each group by X. This reconstructs correct left-to-right reading
// order even though pdf.js can emit items in a different order than how
// they're visually laid out — confirmed by testing against a real Bank
// of Baroda statement, where the Balance column was emitted before
// Serial/Date/Description for every row.
const groupItemsIntoRows = (items: { str: string; transform: number[] }[]): TextRow[] => {
  const rowsByY: Record<number, TextCell[]> = {};

  items.forEach((item) => {
    if (item.str.trim() === '') return; // drop whitespace-only fragments
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    if (!rowsByY[y]) rowsByY[y] = [];
    rowsByY[y].push({ x, str: item.str.trim() });
  });

  const sortedYs = Object.keys(rowsByY).map(Number).sort((a, b) => b - a); // top to bottom
  return sortedYs
    .map((y) => ({ cells: rowsByY[y].sort((a, b) => a.x - b.x) }))
    .filter((row) => row.cells.length > 0);
};

// A "real" transaction row starts with a serial number, followed by a
// DD-MM-YYYY date. Everything else (headers, account info, wrapped
// description continuation lines) doesn't match this pattern.
const isRealRow = (cells: TextCell[]): boolean => {
  const first = cells[0]?.str;
  const second = cells[1]?.str;
  return /^\d+$/.test(first) && /^\d{2}-\d{2}-\d{4}$/.test(second || '');
};

// Page furniture that can appear in the gap between two transaction
// rows (repeated table headers on each page, footer notes) and should
// never be treated as part of a description.
const isPageBoilerplate = (text: string): boolean => {
  return /Account Statement|Account Details|Account Name|Account Number|Account Type|Branch|IFSC|MICR|Customer Address|SerialTransaction|^No$|Page \d|Note:|This is a computer|maintained in the bank/.test(
    text
  );
};

// A money amount always has exactly 2 decimal places (e.g. "45.00",
// "1,234.56"). A DD-MM-YYYY date never has a decimal point. This is what
// reliably tells the two apart — an earlier version of this parser used
// a broader digits-and-dashes pattern that accidentally matched dates
// too, silently reading day-of-month as the transaction amount.
const isMoneyOrDash = (s: string): boolean => s === '-' || /^[\d,]+\.\d{2}$/.test(s);

// A clean description has the pattern "UPI/<ref>/<time>/UPI/<handle>" —
// exactly two "UPI/" occurrences. Trims anything from a 3rd occurrence
// onward, which would be leaked-in text belonging to a different row.
const cleanDescription = (raw: string): string => {
  const matches = [...raw.matchAll(/UPI\//g)];
  if (matches.length <= 2) return raw;
  return raw.slice(0, matches[2].index);
};

// Pulls the UPI handle out of a cleaned description for use as the
// merchant name — the segment after the LAST "UPI/" marker.
const extractMerchant = (description: string): string => {
  if (!description.includes('UPI/')) return description;
  const lastUpiIndex = description.lastIndexOf('UPI/');
  return description.slice(lastUpiIndex + 4) || description;
};

// Converts this bank's DD-MM-YYYY date format into the YYYY-MM-DD format
// used everywhere else in the app.
const convertDate = (ddmmyyyy: string): string => {
  const [day, month, year] = ddmmyyyy.split('-');
  return `${year}-${month}-${day}`;
};

export interface ParseResult {
  transactions: Transaction[];
  skippedCount: number;
}

// Parses a Bank of Baroda-style statement PDF — a dense table with
// UPI-handle-only descriptions, requiring position-based reconstruction
// (see groupItemsIntoRows above for why).
const parseBankOfBarodaFile = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const transactions: Transaction[] = [];
  const unmatchedIndices: number[] = [];
  let skippedCount = 0;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = groupItemsIntoRows(content.items as { str: string; transform: number[] }[]);

    // Find every "real" row on this page up front, so we can look at the
    // gap BETWEEN consecutive real rows — that gap contains the wrapped
    // description text, split between the end of one transaction's
    // description and the start of the next.
    const realIndices = rows
      .map((row, i) => (isRealRow(row.cells) ? i : -1))
      .filter((i) => i !== -1);

    realIndices.forEach((idx, n) => {
      const row = rows[idx];
      const cellStrings = row.cells.map((c) => c.str);

      // "Opening Balance" rows have no debit/credit, just a starting
      // balance — not a real transaction, skip without counting as an error.
      if (cellStrings.join(' ').includes('Opening Balance')) return;

      const prevRealIdx = n > 0 ? realIndices[n - 1] : -1;
      const nextRealIdx = realIndices[n + 1] ?? rows.length;

      // Lines between the previous real row and this one are entirely
      // this row's own description (confirmed by testing — the wrapped
      // text immediately before a row's numbers always belongs to it).
      const before: string[] = [];
      for (let i = prevRealIdx + 1; i < idx; i++) {
        const text = rows[i].cells.map((c) => c.str).join('');
        if (!isPageBoilerplate(text)) before.push(text);
      }

      // Lines between this row and the next real row are a mix of THIS
      // row's tail-end overflow followed by the START of the next row's
      // description. We append fragments one at a time, stopping the
      // moment we've already assembled a complete 2-UPI description —
      // anything after that point belongs to the next row, not this one.
      const after: string[] = [];
      for (let i = idx + 1; i < nextRealIdx; i++) {
        const text = rows[i].cells.map((c) => c.str).join('');
        if (!isPageBoilerplate(text)) after.push(text);
      }

      let rawDescription = before.join('');
      for (const fragment of after) {
        const combined = rawDescription + fragment;
        const upiCount = [...combined.matchAll(/UPI\//g)].length;
        if (upiCount > 2) break; // this fragment starts the NEXT row's description
        rawDescription = combined;
      }
      rawDescription = cleanDescription(rawDescription);

      // Figure out debit vs credit from the numeric cells after the two
      // date columns — using isMoneyOrDash (decimal-point based) rather
      // than a broader digits pattern, so dates can never be mistaken
      // for amounts.
      const numericCells = cellStrings.slice(2).filter(isMoneyOrDash);
      const debitStr = numericCells[0];
      const creditStr = numericCells[1];

      let amount: number;
      let type: 'debit' | 'credit';
      if (debitStr && debitStr !== '-') {
        amount = parseFloat(debitStr.replace(/,/g, ''));
        type = 'debit';
      } else if (creditStr && creditStr !== '-') {
        amount = parseFloat(creditStr.replace(/,/g, ''));
        type = 'credit';
      } else {
        skippedCount++;
        return;
      }

      const date = convertDate(cellStrings[1]);
      if (!date || isNaN(amount) || amount === 0 || !rawDescription) {
        skippedCount++;
        return;
      }

      const merchant = extractMerchant(rawDescription);
      const { category, matched } = detectCategoryMatched(merchant, type);

      transactions.push({
        id: crypto.randomUUID(),
        date,
        description: rawDescription,
        amount,
        type,
        category,
        merchant,
      });
      if (!matched) unmatchedIndices.push(transactions.length - 1);
    });
  }

  if (unmatchedIndices.length > 0) {
    await applyAICategorization(transactions, unmatchedIndices);
  }

  return { transactions, skippedCount };
};

// Peeks at a PDF's page 1 text to figure out which statement format it
// is, then routes to the matching parser. This is the function
// UploadPage.tsx actually calls for any .pdf upload — it doesn't need
// to know that two different bank formats exist underneath.
export const parsePDFFile = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const firstPage = await doc.getPage(1);
  const content = await firstPage.getTextContent();
  const pageText = (content.items as { str: string }[]).map((item) => item.str).join(' ');

  if (looksLikeGooglePayStatement(pageText)) {
    return parseGooglePayFile(file);
  }

  return parseBankOfBarodaFile(file);
};