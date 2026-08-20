import { Calendar, Check, Clock, History, RotateCcw, Sparkles, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { formatTimestamp, parseDateFromTimestamp, toDateTimeLocalString } from '../../utils/storage';

interface TimestampPickerPopoverProps {
  currentTimestamp?: string;
  isoDate?: string;
  onSave: (newTimestamp: string, newIsoDate: string, isCustom: boolean) => void;
  onClose: () => void;
  title?: string;
  align?: 'left' | 'right' | 'center';
}

export const TimestampPickerPopover: React.FC<TimestampPickerPopoverProps> = ({
  currentTimestamp,
  isoDate,
  onSave,
  onClose,
  title = 'Edit Entry Date & Time',
  align = 'left',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize date object
  const initialDate = React.useMemo(() => {
    if (isoDate) {
      const d = new Date(isoDate);
      if (!isNaN(d.getTime())) return d;
    }
    return parseDateFromTimestamp(currentTimestamp);
  }, [currentTimestamp, isoDate]);

  const [selectedDateTime, setSelectedDateTime] = useState(() => toDateTimeLocalString(initialDate));
  const [activePreset, setActivePreset] = useState<'now' | 'yesterday' | 'custom'>('custom');

  // Handle outside clicks to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleApplyPreset = (type: 'now' | 'yesterday' | 'hour_ago') => {
    const now = new Date();
    if (type === 'now') {
      setSelectedDateTime(toDateTimeLocalString(now));
      setActivePreset('now');
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setSelectedDateTime(toDateTimeLocalString(y));
      setActivePreset('yesterday');
    } else if (type === 'hour_ago') {
      const h = new Date(now);
      h.setHours(h.getHours() - 1);
      setSelectedDateTime(toDateTimeLocalString(h));
      setActivePreset('custom');
    }
  };

  const handleConfirm = () => {
    if (!selectedDateTime) return;
    const dateObj = new Date(selectedDateTime);
    if (isNaN(dateObj.getTime())) return;

    const formatted = formatTimestamp(dateObj);
    const newIso = dateObj.toISOString();
    onSave(formatted, newIso, true);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className={`absolute z-[9999] mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-3.5 sm:p-4 bg-white dark:bg-[#202022] rounded-2xl border border-black/15 dark:border-white/20 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
        align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-1.5 text-stone-900 dark:text-stone-100">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close timestamp picker"
          className="min-h-[44px] min-w-[44px] p-2.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => handleApplyPreset('now')}
          className={`flex-1 min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-semibold transition-colors border flex items-center justify-center ${
            activePreset === 'now'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-black/5 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-700'
          }`}
        >
          Today (Now)
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('yesterday')}
          className={`flex-1 min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-semibold transition-colors border flex items-center justify-center ${
            activePreset === 'yesterday'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-black/5 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-700'
          }`}
        >
          Yesterday
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('hour_ago')}
          className="min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-semibold bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-black/5 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center"
          title="1 hour ago"
        >
          -1 hr
        </button>
      </div>

      {/* Native DateTime-Local Input Styled */}
      <div className="space-y-1.5 mb-3.5">
        <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
          Custom Date & Time
        </label>
        <div className="relative">
          <input
            type="datetime-local"
            value={selectedDateTime}
            onChange={(e) => {
              setSelectedDateTime(e.target.value);
              setActivePreset('custom');
            }}
            className="w-full min-h-[44px] px-3 py-2 text-sm font-mono bg-stone-50 dark:bg-stone-900 border border-black/10 dark:border-white/15 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        {selectedDateTime && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-1 truncate">
            → {formatTimestamp(new Date(selectedDateTime))}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded-xl transition-colors flex items-center justify-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="min-h-[44px] px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          <span>Save Date</span>
        </button>
      </div>
    </div>
  );
};
