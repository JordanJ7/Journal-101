import React, { useState } from 'react';
import { X, GitMerge, Pin, AlertCircle } from 'lucide-react';
import { useJournalStore } from '../../store/useJournalStore';
import { WeeklyBlock } from '../../types';
import { compareWeeksForSidebar } from '../../utils/dateUtils';

interface MergeWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: WeeklyBlock;
  onConfirmMerge: (targetWeekId: string) => void;
}

export const MergeWeekModal: React.FC<MergeWeekModalProps> = ({
  isOpen,
  onClose,
  sourceWeek,
  onConfirmMerge,
}) => {
  const weeks = useJournalStore((s) => s.weeks);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  if (!isOpen) return null;

  const candidateWeeks = weeks
    .filter((w) => !w.deletedAt && w.id !== sourceWeek.id)
    .sort(compareWeeksForSidebar);

  const activeSourceBullets = (sourceWeek.bullets || []).filter((b) => !b.deletedAt);

  const handleMerge = () => {
    if (!selectedTargetId) return;
    onConfirmMerge(selectedTargetId);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-week-title"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-amber-500" />
            <h3 id="merge-week-title" className="text-sm font-bold">Merge into…</h3>
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

        <div className="p-4 border-b border-black/5 dark:border-white/10 bg-amber-500/5 text-xs text-stone-600 dark:text-stone-300 flex items-start gap-2.5 shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            All <span className="font-bold">{activeSourceBullets.length} entries</span> from{' '}
            <span className="font-bold">"{sourceWeek.weekTitle}"</span> will be moved into the chosen week.
            "{sourceWeek.weekTitle}" will then be soft-deleted.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {candidateWeeks.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-8">
              No other weeks available to merge into.
            </p>
          ) : (
            candidateWeeks.map((week) => {
              const isSelected = selectedTargetId === week.id;
              return (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => setSelectedTargetId(week.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15'
                      : 'border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
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
                        {week.startDate} {week.endDate && `– ${week.endDate}`} · {week.bullets?.filter((b) => !b.deletedAt).length || 0} existing entries
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-stone-300 dark:border-stone-600'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTargetId}
            onClick={handleMerge}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Merge Weeks</span>
          </button>
        </div>
      </div>
    </div>
  );
};
