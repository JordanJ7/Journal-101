import React, { useEffect } from 'react';
import { useJournalStore } from '../store/useJournalStore';
import { Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const toastMessage = useJournalStore((s) => s.toastMessage);
  const hideToast = useJournalStore((s) => s.hideToast);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage, hideToast]);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-900/95 dark:bg-stone-100/95 text-white dark:text-stone-900 shadow-xl border border-white/10 dark:border-black/10 text-xs font-medium backdrop-blur-md max-w-md">
        <Info className="w-4 h-4 text-amber-400 dark:text-amber-600 shrink-0" />
        <span className="truncate">{toastMessage}</span>
        <button
          type="button"
          onClick={hideToast}
          aria-label="Dismiss toast"
          className="ml-1 p-0.5 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 text-white/70 dark:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
