import React, { useMemo } from 'react';
import { WeeklyBlock } from '../../types';
import { isCurrentWeek } from '../../utils/dateUtils';
import { parseDateFromTimestamp } from '../../utils/storage';

interface DaysYouWroteCardProps {
  weeks: WeeklyBlock[];
  activeWeekId?: string;
  className?: string;
}

const DAYS = [
  { label: 'M', dayIndex: 1, fullName: 'Monday' },
  { label: 'T', dayIndex: 2, fullName: 'Tuesday' },
  { label: 'W', dayIndex: 3, fullName: 'Wednesday' },
  { label: 'T', dayIndex: 4, fullName: 'Thursday' },
  { label: 'F', dayIndex: 5, fullName: 'Friday' },
  { label: 'S', dayIndex: 6, fullName: 'Saturday' },
  { label: 'S', dayIndex: 0, fullName: 'Sunday' },
];

export const DaysYouWroteCard: React.FC<DaysYouWroteCardProps> = React.memo(({
  weeks,
  activeWeekId,
  className = '',
}) => {
  // Find current week, or active week, or the first available week
  const targetWeek = useMemo(() => {
    return (
      weeks.find((w) => isCurrentWeek(w)) ||
      (activeWeekId ? weeks.find((w) => w.id === activeWeekId) : null) ||
      weeks[0] ||
      null
    );
  }, [weeks, activeWeekId]);

  // Determine which days have at least one entry
  const writtenDays = useMemo(() => {
    const set = new Set<number>();
    if (!targetWeek || !targetWeek.bullets) return set;

    for (const bullet of targetWeek.bullets) {
      if (bullet.deletedAt) continue;
      const d = bullet.isoDate
        ? new Date(bullet.isoDate)
        : bullet.createdAt
        ? new Date(bullet.createdAt)
        : parseDateFromTimestamp(bullet.timestamp);
      if (d && !isNaN(d.getTime())) {
        set.add(d.getDay());
      }
    }
    return set;
  }, [targetWeek]);

  return (
    <div
      className={`w-full bg-white dark:bg-[#18181b] rounded-[14px] border border-stone-200/80 dark:border-white/10 p-4 shadow-xs space-y-3 ${className}`}
    >
      {/* Seven small circles M–S */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-1">
        {DAYS.map((day, idx) => {
          const isFilled = writtenDays.has(day.dayIndex);
          return (
            <div
              key={`${day.label}-${idx}`}
              title={`${day.fullName}: ${isFilled ? 'Entry written' : 'No entries'}`}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono select-none transition-colors ${
                isFilled
                  ? 'bg-amber-500 text-stone-900 font-medium border border-amber-500 shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-400 border border-stone-200/80 dark:border-white/10 font-medium'
              }`}
            >
              {day.label}
            </div>
          );
        })}
      </div>

      {/* Caption without streak counts or warnings */}
      <p className="text-xs font-medium text-stone-600 dark:text-stone-300 text-center pt-2.5 border-t border-stone-100 dark:border-white/5">
        Days you wrote this week
      </p>
    </div>
  );
});

DaysYouWroteCard.displayName = 'DaysYouWroteCard';
