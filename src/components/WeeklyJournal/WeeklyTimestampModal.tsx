import React, { useEffect, useState } from 'react';
import { Calendar, Clock, RotateCcw, Sparkles, X, Check } from 'lucide-react';
import {
  formatTimestamp,
  parseDateFromTimestamp,
  toDateTimeLocalString,
  getWeekTitleAndRangeForDate,
} from '../../utils/storage';

interface WeeklyTimestampModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCreatedAt?: string;
  weekTitle: string;
  onSave: (newIsoDate: string, newFormattedTimestamp: string) => void;
}

export const WeeklyTimestampModal: React.FC<WeeklyTimestampModalProps> = ({
  isOpen,
  onClose,
  currentCreatedAt,
  weekTitle,
  onSave,
}) => {
  const [dateTimeLocal, setDateTimeLocal] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialDate = parseDateFromTimestamp(currentCreatedAt);
      setDateTimeLocal(toDateTimeLocalString(initialDate));
    }
  }, [isOpen, currentCreatedAt]);

  // Handle keyboard shortcuts (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsedCurrent = parseDateFromTimestamp(dateTimeLocal);
  const liveFormattedTimestamp = formatTimestamp(parsedCurrent);
  const liveWeekInfo = getWeekTitleAndRangeForDate(parsedCurrent);
  const isWeekGroupingChanged =
    liveWeekInfo.weekTitle.toLowerCase() !== weekTitle.toLowerCase();

  const handleApplyPreset = (preset: 'now' | 'yesterday' | 'monday' | 'sunday') => {
    const now = new Date();
    let target = new Date(parsedCurrent.getTime());

    if (preset === 'now') {
      target = new Date();
    } else if (preset === 'yesterday') {
      target = new Date();
      target.setDate(target.getDate() - 1);
    } else if (preset === 'monday') {
      const day = parsedCurrent.getDay();
      const diffToMonday = parsedCurrent.getDate() - (day === 0 ? 6 : day - 1);
      target = new Date(parsedCurrent);
      target.setDate(diffToMonday);
      target.setHours(9, 0, 0, 0);
    } else if (preset === 'sunday') {
      const day = parsedCurrent.getDay();
      const diffToMonday = parsedCurrent.getDate() - (day === 0 ? 6 : day - 1);
      target = new Date(parsedCurrent);
      target.setDate(diffToMonday + 6);
      target.setHours(20, 0, 0, 0);
    }

    setDateTimeLocal(toDateTimeLocalString(target));
  };

  const handleSave = () => {
    const finalDate = parseDateFromTimestamp(dateTimeLocal);
    const finalIso = finalDate.toISOString();
    const finalFormatted = formatTimestamp(finalDate);
    onSave(finalIso, finalFormatted);
    onClose();
  };

  return (
    <div
      id="weekly-timestamp-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="weekly-timestamp-modal-card"
        className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Edit Weekly Entry Timestamp
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Adjust overarching creation date and chronological position
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Quick Date Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('now')}
                className="min-h-[40px] px-2.5 py-2 text-xs font-medium bg-stone-100 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 text-stone-700 dark:text-stone-300 rounded-xl border border-stone-200/80 dark:border-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Now</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('yesterday')}
                className="min-h-[40px] px-2.5 py-2 text-xs font-medium bg-stone-100 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 text-stone-700 dark:text-stone-300 rounded-xl border border-stone-200/80 dark:border-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yesterday</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('monday')}
                className="min-h-[40px] px-2.5 py-2 text-xs font-medium bg-stone-100 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 text-stone-700 dark:text-stone-300 rounded-xl border border-stone-200/80 dark:border-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Monday</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('sunday')}
                className="min-h-[40px] px-2.5 py-2 text-xs font-medium bg-stone-100 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 text-stone-700 dark:text-stone-300 rounded-xl border border-stone-200/80 dark:border-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Sunday</span>
              </button>
            </div>
          </div>

          {/* DateTime Picker Input */}
          <div>
            <label
              htmlFor="weekly-datetime-picker-input"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
            >
              Exact Date & Time
            </label>
            <input
              id="weekly-datetime-picker-input"
              type="datetime-local"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-stone-50 dark:bg-black/40 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded-xl space-y-2">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Updated Entry Overview
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-mono text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                {liveFormattedTimestamp}
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-1 text-xs text-stone-600 dark:text-stone-300 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Week Title:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {liveWeekInfo.weekTitle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Date Range:</span>
                <span className="font-mono text-[11px] text-stone-600 dark:text-stone-400">
                  {liveWeekInfo.startDate} – {liveWeekInfo.endDate}
                </span>
              </div>
            </div>

            {isWeekGroupingChanged && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                ℹ️ <strong>Calendar Week Re-assignment:</strong> This entry will be re-grouped under{' '}
                <strong>{liveWeekInfo.weekTitle}</strong> and re-sorted chronologically across your timeline and sidebar.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-black/5 dark:border-white/10 flex items-center justify-end gap-2.5 bg-stone-50/50 dark:bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Reorder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
