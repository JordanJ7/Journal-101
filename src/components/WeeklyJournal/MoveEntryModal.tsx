import React from 'react';
import { X, Calendar, ArrowRight, Pin } from 'lucide-react';
import { useJournalStore } from '../../store/useJournalStore';
import { BulletPoint, WeeklyBlock } from '../../types';
import { compareWeeksForSidebar } from '../../utils/dateUtils';

interface MoveEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bullet: BulletPoint;
  sourceWeekId: string;
  onSelectTargetWeek: (targetWeekId: string) => void;
}

export const MoveEntryModal: React.FC<MoveEntryModalProps> = ({
  isOpen,
  onClose,
  bullet,
  sourceWeekId,
  onSelectTargetWeek,
}) => {
  const weeks = useJournalStore((s) => s.weeks);

  if (!isOpen) return null;

  const candidateWeeks = weeks
    .filter((w) => !w.deletedAt && w.id !== sourceWeekId)
    .sort(compareWeeksForSidebar);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-entry-title"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <div>
            <h3 id="move-entry-title" className="text-sm font-bold">Move to another week…</h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate max-w-xs">
              "{bullet.text.slice(0, 45) || 'Entry'}"
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {candidateWeeks.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-8">
              No other weeks available to move this entry into.
            </p>
          ) : (
            candidateWeeks.map((week) => (
              <button
                key={week.id}
                type="button"
                onClick={() => {
                  onSelectTargetWeek(week.id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl border border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    {week.isPinned && (
                      <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate">{week.weekTitle}</span>
                  </div>
                  {(week.startDate || week.endDate) && (
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      {week.startDate} {week.endDate && `– ${week.endDate}`} · {week.bullets?.filter((b) => !b.deletedAt).length || 0} entries
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
