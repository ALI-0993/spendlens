import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, PieChart, ShieldCheck, Lock, HelpCircle } from 'lucide-react';
import { parseCSVFile, parseExcelFile } from '../utils/parseCSV';
import { parsePDFFile } from '../utils/parsePDF';
import { getMostRecentMonth, mergeTransactions } from '../utils/calculations';
import { useTransactionStore } from '../store/transactionStore';

type Status = 'idle' | 'parsing' | 'success' | 'error';

const UploadPage = () => {
  const navigate = useNavigate();
  const transactions = useTransactionStore((state) => state.transactions);
  const setTransactions = useTransactionStore((state) => state.setTransactions);
  const setSelectedMonth = useTransactionStore((state) => state.setSelectedMonth);

  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    addedCount: number;
    duplicateCount: number;
    skippedCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isCSV = lowerName.endsWith('.csv');
    const isExcel = lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx');
    const isPDF = lowerName.endsWith('.pdf');

    if (!isCSV && !isExcel && !isPDF) {
      setStatus('error');
      setErrorMessage('Please upload a .csv, .xls, .xlsx, or .pdf file.');
      return;
    }

    setStatus('parsing');

    try {
      const { transactions: parsedTransactions, skippedCount } = isCSV
        ? await parseCSVFile(file)
        : isExcel
        ? await parseExcelFile(file)
        : await parsePDFFile(file);

      if (parsedTransactions.length === 0) {
        setStatus('error');
        setErrorMessage(
          "Couldn't find any valid transactions in this file. Check that it has Date, Description, and Amount columns."
        );
        return;
      }

      // Merge the newly parsed transactions into whatever's already in
      // the store, skipping anything that looks like a duplicate of an
      // existing transaction — rather than replacing the dataset
      // outright, which would silently throw away everything from
      // previous uploads.
      const { merged, addedCount, duplicateCount } = mergeTransactions(transactions, parsedTransactions);
      setTransactions(merged);

      // Point selectedMonth at the most recent month in the FULL merged
      // dataset, not just the newly uploaded file — otherwise uploading
      // an older statement after a newer one would jump the Dashboard
      // backwards in time.
      const mostRecentMonth = getMostRecentMonth(merged);
      if (mostRecentMonth) {
        setSelectedMonth(mostRecentMonth);
      }
      setStatus('success');
      setSuccessInfo({ addedCount, duplicateCount, skippedCount });
    } catch (err) {
      setStatus('error');
      setErrorMessage('Something went wrong while reading this file. Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Upload</h1>
          <p className="text-text-muted mt-1 text-sm">
            Upload your bank or UPI statement to import and analyze your transactions.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2 border transition-colors shrink-0"
          style={{ color: '#3B82F6', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}
        >
          <HelpCircle size={15} />
          How uploading works?
        </button>
      </div>

      {/* 3-step process banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#EFF6FF' }}
            >
              <FileText size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">1. Upload File</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload your bank statement or UPI transaction file.
              </p>
            </div>
          </div>

          <div className="text-gray-300 shrink-0">→</div>

          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#EEF2FF' }}
            >
              <Sparkles size={20} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">2. We Process</p>
              <p className="text-xs text-gray-400 mt-0.5">
                We parse and categorize your transactions automatically.
              </p>
            </div>
          </div>

          <div className="text-gray-300 shrink-0">→</div>

          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#F5F3FF' }}
            >
              <PieChart size={20} style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">3. View Insights</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Explore your spending patterns and get AI insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid — dropzone + sidebar */}
      <div className="grid grid-cols-3 gap-4">
        {/* Dropzone column */}
        <div className="col-span-2 flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="bg-white rounded-xl border-2 border-dashed p-14 flex flex-col items-center justify-center text-center transition-colors"
            style={{
              borderColor: isDragging ? '#3B82F6' : '#E5E7EB',
              backgroundColor: isDragging ? '#3B82F60D' : 'white',
            }}
          >
            {status === 'parsing' ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: '#EFF6FF' }}
                >
                  <FileText size={28} className="animate-pulse" style={{ color: '#3B82F6' }} />
                </div>
                <p className="mt-3 text-base font-bold text-gray-800">Parsing your statement…</p>
              </>
            ) : (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: '#EFF6FF' }}
                >
                  <Upload size={28} style={{ color: '#3B82F6' }} />
                </div>
                <p className="mt-3 text-base font-bold text-gray-800">Drag &amp; drop your file here</p>
                <p className="mt-1 text-sm text-gray-400">or</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-white rounded-lg px-5 py-2.5 transition-colors"
                  style={{ backgroundColor: '#3B82F6' }}
                >
                  <Upload size={15} />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx,.pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <p className="mt-4 text-xs text-gray-400">
                  Supported formats: <span className="font-semibold text-gray-500">CSV, Excel, PDF</span>
                </p>
              </>
            )}
          </div>

          {/* Success message */}
          {status === 'success' && successInfo && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
              <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">
                  Added {successInfo.addedCount} new transaction{successInfo.addedCount === 1 ? '' : 's'}
                </p>
                {successInfo.duplicateCount > 0 && (
                  <p className="text-xs text-green-700 mt-0.5">
                    {successInfo.duplicateCount} already existed and {successInfo.duplicateCount === 1 ? 'was' : 'were'} skipped.
                  </p>
                )}
                {successInfo.skippedCount > 0 && (
                  <p className="text-xs text-green-700 mt-0.5">
                    {successInfo.skippedCount} row{successInfo.skippedCount > 1 ? 's' : ''} couldn't be read and
                    were skipped.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mt-3 text-sm font-semibold text-white rounded-lg px-4 py-2 transition-colors"
                  style={{ backgroundColor: '#10B981' }}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <ShieldCheck size={16} className="text-green-600 shrink-0" />
            <p className="text-xs text-green-800">
              Your data is 100% secure. We never store your bank credentials or sell your data.
            </p>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} style={{ color: '#3B82F6' }} />
              <p className="text-sm font-bold text-gray-900">Supported Formats</p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {['CSV (.csv)', 'Excel (.xls, .xlsx)', 'PDF (.pdf)'].map((format) => (
                <span
                  key={format}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}
                >
                  {format}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bank statements, UPI transaction history (Google Pay, PhonePe, Paytm), and exported
              account statements.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} style={{ color: '#3B82F6' }} />
              <p className="text-sm font-bold text-gray-900">Tips for best results</p>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                'Export your statement directly from your bank or UPI app',
                'Ensure all columns are visible and not cropped',
                'Keep file size under 10MB',
                'Make sure date and amount columns are included',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-gray-500">
                  <CheckCircle2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{ backgroundColor: '#EFF6FF' }}
          >
            <Lock size={15} style={{ color: '#3B82F6' }} className="mt-0.5 shrink-0" />
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              We only read your transaction data and never store your files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;