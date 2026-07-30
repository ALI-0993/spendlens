import { MonitorSmartphone } from 'lucide-react';

const MobileBlocker = () => {
  return (
    <>
      <style>
        {`
          @keyframes spendlens-fade-in {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A] px-6">
        <div
          className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E293B] shadow-xl shadow-slate-900/10 dark:shadow-black/30 p-8 text-center"
          style={{ animation: 'spendlens-fade-in 0.5s ease-out' }}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6]/10">
            <MonitorSmartphone className="h-7 w-7 text-[#3B82F6]" strokeWidth={1.75} />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-3">
            Mobile Devices Not Supported
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
            SpendLens is an analytics-focused dashboard designed for larger screens.
            It contains detailed charts, financial reports, tables, and data
            visualizations that require adequate screen space for the best experience.
          </p>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Please access SpendLens using a tablet, laptop, desktop, or TV for full
            functionality.
          </p>
        </div>
      </div>
    </>
  );
};

export default MobileBlocker;