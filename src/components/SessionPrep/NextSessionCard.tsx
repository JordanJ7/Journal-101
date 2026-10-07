import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  Edit2,
  ExternalLink,
  Plus,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { AccentTheme, BulletPoint, WeeklyBlock } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';

export interface NextSessionCardProps {
  weeks: WeeklyBlock[];
  nextSessionAt: string | null;
  onSetNextSessionAt: (nextSessionAt: string | null) => void;
  onOpenSessionPrep: () => void;
  onToggleDiscussed: (weekId: string, bulletId: string, discussed: boolean) => void;
  isOwner?: boolean;
  accentTheme?: AccentTheme;
}

export function formatSessionDateTime(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${weekday}, ${month} ${day} · ${time}`;
}

export const NextSessionCard: React.FC<NextSessionCardProps> = ({
  weeks,
  nextSessionAt,
  onSetNextSessionAt,
  onOpenSessionPrep,
  onToggleDiscussed,
  isOwner = true,
  accentTheme = 'amber',
}) => {
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [dateTimeInput, setDateTimeInput] = useState('');

  // Find all tagged entries not yet discussed
  const unDiscussedEntries: { weekId: string; weekTitle: string; bullet: BulletPoint }[] = [];
  for (const week of weeks) {
    if (week.deletedAt) continue;
    for (const bullet of week.bullets || []) {
      if (bullet.deletedAt) continue;
      if (bullet.forSession && !bullet.discussedAt) {
        unDiscussedEntries.push({
          weekId: week.id,
          weekTitle: week.weekTitle,
          bullet,
        });
      }
    }
  }

  const handleStartEdit = () => {
    if (!isOwner) return;
    if (nextSessionAt) {
      try {
        const d = new Date(nextSessionAt);
        if (!isNaN(d.getTime())) {
          // Format as YYYY-MM-DDTHH:mm for datetime-local
          const pad = (n: number) => String(n).padStart(2, '0');
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setDateTimeInput(localIso);
        } else {
          setDateTimeInput('');
        }
      } catch {
        setDateTimeInput('');
      }
    } else {
      // Default to next week at 14:00
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(14, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      setDateTimeInput(`${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}T14:00`);
    }
    setIsEditingDateTime(true);
  };

  const handleSaveDateTime = () => {
    if (!dateTimeInput) {
      onSetNextSessionAt(null);
    } else {
      const d = new Date(dateTimeInput);
      if (!isNaN(d.getTime())) {
        onSetNextSessionAt(d.toISOString());
      }
    }
    setIsEditingDateTime(false);
  };

  const handleClearDateTime = () => {
    onSetNextSessionAt(null);
    setIsEditingDateTime(false);
  };

  return (
    <div className="w-full bg-white dark:bg-[#18181b] rounded-[14px] border border-stone-200/80 dark:border-white/10 p-4 shadow-xs space-y-3.5">
      {/* Header & Next Session Date */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-stone-950 bg-amber-500 font-bold`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Next Session
            </span>
          </div>

          {isOwner && !isEditingDateTime && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="min-h-[44px] px-2 text-[11px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Change session date & time"
            >
              <Edit2 className="w-3 h-3" />
              <span>{nextSessionAt ? 'Edit' : 'Set date'}</span>
            </button>
          )}
        </div>

        {/* Date / Time Display or Editor */}
        {isEditingDateTime ? (
          <div className="mt-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
            <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-300 font-mono">
              Session Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateTimeInput}
              onChange={(e) => setDateTimeInput(e.target.value)}
              className="w-full text-xs font-mono p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="flex items-center justify-end gap-1.5 pt-1">
              {nextSessionAt && (
                <button
                  type="button"
                  onClick={handleClearDateTime}
                  className="min-h-[44px] px-2.5 py-1 text-xs rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditingDateTime(false)}
                className="min-h-[44px] px-3 py-1 text-xs rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDateTime}
                className="min-h-[44px] px-3.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-xs cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={isOwner ? handleStartEdit : undefined}
            className={`min-h-[44px] p-2.5 rounded-xl border transition-all flex items-center ${
              nextSessionAt
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-950 dark:text-amber-200'
                : 'bg-stone-50 dark:bg-stone-800/40 border-dashed border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400'
            } ${isOwner ? 'cursor-pointer hover:border-amber-400 dark:hover:border-amber-700' : ''}`}
            title={isOwner ? 'Click to set or change session date & time' : undefined}
          >
            {nextSessionAt ? (
              <div className="w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-semibold font-mono text-xs truncate">
                    {formatSessionDateTime(nextSessionAt)}
                  </span>
                </div>
                {isOwner && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 shrink-0 font-medium font-mono">
                    Change
                  </span>
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 py-0.5 text-center">
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {isOwner ? 'Schedule Next Session' : 'No Session Scheduled'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* "Bring up" Checklist Section */}
      <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Bring up
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono font-medium">
              {unDiscussedEntries.length}
            </span>
          </div>
        </div>

        {/* Checklist Entries */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {unDiscussedEntries.length === 0 ? (
            <p className="text-xs text-stone-400 dark:text-stone-400 py-3 text-center italic">
              No items tagged yet. Tag entries with "Bring to session" to list them here.
            </p>
          ) : (
            unDiscussedEntries.map(({ weekId, weekTitle, bullet }) => (
              <div
                key={bullet.id}
                className="group flex items-center gap-2 p-2 min-h-[44px] rounded-xl bg-stone-50/80 dark:bg-stone-800/40 hover:bg-stone-100/90 dark:hover:bg-stone-800/80 border border-stone-200/60 dark:border-white/5 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onToggleDiscussed(weekId, bullet.id, true)}
                  className="min-h-[44px] min-w-[32px] flex items-center justify-center text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                  title="Mark as discussed"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate leading-snug">
                    {bullet.text || 'Untitled entry'}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-400 font-mono truncate mt-0.5">
                    {weekTitle}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* "Open session prep" Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onOpenSessionPrep}
          className="w-full min-h-[44px] py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer bg-amber-500 hover:bg-amber-400 text-stone-950"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Open session prep</span>
        </button>
      </div>
    </div>
  );
};
