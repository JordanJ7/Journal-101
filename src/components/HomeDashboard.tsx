import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Folder,
  History,
  Sparkles,
  Utensils,
  Palette,
  ArrowRight,
  Plus,
  Pin,
  SlidersHorizontal,
  PinOff,
} from 'lucide-react';
import {
  AccentTheme,
  BulletPoint,
  CoreCategoryConfig,
  CoreCategoryId,
  CoreTopicItem,
  WeeklyBlock,
} from '../types';
import { ACCENT_THEMES } from '../utils/theme';
import { CustomizePinnedTopicsModal } from './CustomizePinnedTopicsModal';

// Fixed journey start date: October 25, 2021, 12:00 AM (Month index 9 is October)
export const JOURNEY_START_DATE = new Date(2021, 9, 25, 0, 0, 0);

/**
 * Calculates continuous elapsed time from the start date to now
 * formatted as X years, Y months, Z days
 */
export function formatTimeElapsed(startDate: Date): string {
  const now = new Date();
  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();
  let days = now.getDate() - startDate.getDate();
  let hours = now.getHours() - startDate.getHours();
  let minutes = now.getMinutes() - startDate.getMinutes();

  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  if (hours < 0) {
    days -= 1;
    hours += 24;
  }
  if (days < 0) {
    months -= 1;
    // Calculate days in the previous month
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);

  return parts.join(', ');
}

interface HomeDashboardProps {
  weeks: WeeklyBlock[];
  coreItems: CoreTopicItem[];
  coreCategories: CoreCategoryConfig[];
  pinnedCategoryIds?: string[];
  accentTheme: AccentTheme;
  onNavigateToWeek: (weekId: string) => void;
  onNavigateToCoreCategory: (catId: CoreCategoryId) => void;
  onNavigateToView: (mode: 'weekly' | 'core' | 'media') => void;
  onAddNewWeek?: () => void;
  onUpdatePinnedCategoryIds?: (newPinnedIds: string[]) => void;
  onTogglePinCategory?: (categoryId: string) => void;
}

// Icon dictionary mapped to match standard Lucide icons
const FOLDER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Palette,
  History,
  Sparkles,
  Compass,
  Folder,
  BookOpen,
};

const DEFAULT_PINNED_IDS = [
  'foods-to-try',
  'my-hobbies',
  'backstory-stuff',
  'things-i-want-to-do',
];

export const HomeDashboard: React.FC<HomeDashboardProps> = React.memo(({
  weeks = [],
  coreItems = [],
  coreCategories = [],
  pinnedCategoryIds = DEFAULT_PINNED_IDS,
  accentTheme,
  onNavigateToWeek,
  onNavigateToCoreCategory,
  onNavigateToView,
  onAddNewWeek,
  onUpdatePinnedCategoryIds,
  onTogglePinCategory,
}) => {
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  // Live discreet counter since October 25, 2021
  const [timeElapsed, setTimeElapsed] = useState<string>(() => formatTimeElapsed(JOURNEY_START_DATE));

  useEffect(() => {
    setTimeElapsed(formatTimeElapsed(JOURNEY_START_DATE));
    const intervalId = setInterval(() => {
      setTimeElapsed(formatTimeElapsed(JOURNEY_START_DATE));
    }, 60 * 1000); // Live update once per minute

    return () => clearInterval(intervalId);
  }, []);

  // Format today's date cleanly (e.g. Wednesday, August 19, 2026)
  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return new Date().toDateString();
    }
  }, []);

  // Dynamically resolve pinned categories from user preferences or defaults
  const pinnedFolders = useMemo(() => {
    const activePinnedIds =
      pinnedCategoryIds && pinnedCategoryIds.length > 0
        ? pinnedCategoryIds
        : DEFAULT_PINNED_IDS;

    return activePinnedIds
      .map((pinnedId) => {
        // 1. Try exact ID match in existing categories
        let matched = coreCategories.find(
          (c) => c.id.toLowerCase() === pinnedId.toLowerCase()
        );

        // 2. Try match by keyword if standard fallback
        if (!matched) {
          matched = coreCategories.find((c) => {
            const lowerTitle = c.title.toLowerCase();
            const lowerId = c.id.toLowerCase();
            const targetLower = pinnedId.toLowerCase();
            return lowerTitle.includes(targetLower) || lowerId.includes(targetLower);
          });
        }

        if (matched) {
          const count = coreItems.filter((item) => item.categoryId === matched!.id).length;
          return {
            id: matched.id,
            title: matched.title,
            iconName: matched.iconName || 'Folder',
            count,
            exists: true,
          };
        }

        // 3. Fallback graceful representation if category not yet loaded or default
        const titleFormatted = pinnedId
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        let fallbackIcon = 'Folder';
        if (pinnedId.includes('food')) fallbackIcon = 'Utensils';
        else if (pinnedId.includes('hobbi')) fallbackIcon = 'Palette';
        else if (pinnedId.includes('backstory') || pinnedId.includes('history')) fallbackIcon = 'History';
        else if (pinnedId.includes('want-to-do') || pinnedId.includes('compass')) fallbackIcon = 'Compass';

        const count = coreItems.filter((item) => item.categoryId === pinnedId).length;

        return {
          id: pinnedId as CoreCategoryId,
          title: titleFormatted,
          iconName: fallbackIcon,
          count,
          exists: false,
        };
      })
      .filter(Boolean);
  }, [pinnedCategoryIds, coreCategories, coreItems]);

  // Pull the single most recent weekly entry based on timestamp or ISO date
  const latestWeeklyData = useMemo(() => {
    if (!weeks || weeks.length === 0) return null;

    // Sort weeks prioritizing newest date / creation timestamp
    const sortedWeeks = [...weeks].sort((a, b) => {
      const timeA = new Date(a.startDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.startDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const targetWeek = sortedWeeks[0];
    if (!targetWeek) return null;

    // Extract newest bullet reflection or session note
    const bullets = Array.isArray(targetWeek.bullets) ? targetWeek.bullets : [];
    const validBullets = bullets.filter((b: BulletPoint) => b.text && b.text.trim().length > 0);
    const totalItems = validBullets.length;

    // Format display date for the week
    let displayTime = targetWeek.startDate || targetWeek.createdAt || 'Recent';
    if (targetWeek.startDate && targetWeek.endDate) {
      displayTime = `${targetWeek.startDate} – ${targetWeek.endDate}`;
    }

    return {
      week: targetWeek,
      displayTime,
      bullets: validBullets.slice(0, 3), // Show top 3 points as a preview
      totalItems,
      therapistNotes: targetWeek.therapistSection?.notes?.trim(),
    };
  }, [weeks]);

  const handleSavePinned = (newPinnedIds: string[]) => {
    if (onUpdatePinnedCategoryIds) {
      onUpdatePinnedCategoryIds(newPinnedIds);
    }
  };

  const handleUnpinSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePinCategory) {
      onTogglePinCategory(id);
    } else if (onUpdatePinnedCategoryIds) {
      onUpdatePinnedCategoryIds(pinnedFolders.map((f) => f.id).filter((item) => item !== id));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Greeting & Quick Overview Header */}
      <section className="space-y-1.5 pt-1 sm:pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-semibold tracking-wider uppercase ${currentAccent.textPrimary}`}>
            Overview
          </span>
          <span
            className="text-[11px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500 font-mono"
            title="Continuous time since October 25, 2021"
          >
            {timeElapsed}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {todayFormatted}
          </p>
        </div>
      </section>

      {/* 2. Featured Topic Folders Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider uppercase">
              Pinned Topics
            </h2>
            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-200/70 dark:bg-white/10 px-2 py-0.5 rounded-full">
              {pinnedFolders.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomizeModalOpen(true)}
              className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium ${currentAccent.tagBadge} ${currentAccent.hoverText}`}
              title="Change pinned topics at any time"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToView('core')}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors px-2 py-1"
            >
              <span>All Folders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Grid: 2 columns on sm/md+, 1 column on mobile */}
        {pinnedFolders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pinnedFolders.map((folder) => {
              const IconComponent = FOLDER_ICON_MAP[folder.iconName] || Folder;

              return (
                <div
                  key={folder.id}
                  onClick={() => onNavigateToCoreCategory(folder.id as CoreCategoryId)}
                  className={`w-full h-auto min-h-[52px] py-2.5 px-3.5 rounded-xl bg-white dark:bg-[#18181b] hover:bg-neutral-50 dark:hover:bg-white/[0.06] border border-neutral-200 dark:border-white/5 flex items-center justify-between gap-3 box-border transition-all duration-150 ease-out cursor-pointer group shadow-2xs active:scale-[0.99] relative ${currentAccent.hoverBorder}`}
                >
                  {/* Left side: Matching icon + folder title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 py-0.5">
                    <span className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}>
                      <IconComponent className="w-4 h-4 shrink-0" />
                    </span>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 text-left leading-snug break-words whitespace-normal flex-1 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                      {folder.title}
                    </span>
                  </div>

                  {/* Right side: Note count badge + Unpin / Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-neutral-200/60 dark:border-white/5 shrink-0">
                      {folder.count} {folder.count === 1 ? 'note' : 'notes'}
                    </span>

                    {/* Quick Unpin on hover button */}
                    <button
                      type="button"
                      onClick={(e) => handleUnpinSingle(folder.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shrink-0"
                      title="Unpin from Home"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </div>
                </div>
              );
            })}

            {/* Quick "+ Add Pin" placeholder card if under 6 pins */}
            {pinnedFolders.length < 6 && (
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(true)}
                className={`w-full h-auto min-h-[52px] py-2.5 px-3.5 rounded-xl border border-dashed border-neutral-300 dark:border-white/10 text-neutral-500 flex items-center justify-center gap-2 text-xs font-medium transition-all group box-border ${currentAccent.hoverBorder} ${currentAccent.hoverText}`}
              >
                <Plus className="w-4 h-4 text-neutral-400 group-hover:currentColor transition-colors shrink-0" />
                <span>Add Pinned Topic</span>
              </button>
            )}
          </div>
        ) : (
          /* Empty state for pinned topics */
          <div className="p-6 rounded-2xl border border-dashed border-neutral-300 dark:border-white/10 text-center space-y-3 bg-white dark:bg-[#18181b]">
            <div className={`w-9 h-9 rounded-full mx-auto flex items-center justify-center ${currentAccent.iconBox}`}>
              <Pin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                No topics pinned yet
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Pin your favorite folders to access them directly from Home.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomizeModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs ${currentAccent.buttonPrimary}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Choose Pinned Topics</span>
            </button>
          </div>
        )}
      </section>

      {/* 3. Latest Weekly Entry Section */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider uppercase">
            Latest Entry
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToView('weekly')}
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
          >
            <span>Weekly Timeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestWeeklyData ? (
          <div
            onClick={() => onNavigateToWeek(latestWeeklyData.week.id)}
            className={`w-full rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-white/5 p-5 sm:p-6 hover:bg-neutral-50/80 dark:hover:bg-white/[0.06] transition-all duration-150 ease-out cursor-pointer group shadow-xs space-y-4 ${currentAccent.hoverBorder}`}
          >
            {/* Header: Entry Title & Time */}
            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 dark:border-white/5 pb-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md ${currentAccent.tagBadge}`}>
                    Week Reflection
                  </span>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <Clock className="w-3 h-3" />
                    <span>{latestWeeklyData.displayTime}</span>
                  </div>
                </div>
                <h3 className={`text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 transition-colors truncate ${currentAccent.groupHoverText}`}>
                  {latestWeeklyData.week.weekTitle}
                </h3>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/5 px-2.5 py-1 rounded-full font-medium border border-neutral-200/60 dark:border-white/5">
                  {latestWeeklyData.totalItems} {latestWeeklyData.totalItems === 1 ? 'bullet' : 'bullets'}
                </span>
              </div>
            </div>

            {/* Body: Reflection Previews or Bullets */}
            <div className="space-y-2 text-neutral-700 dark:text-neutral-300">
              {latestWeeklyData.bullets.length > 0 ? (
                <div className="space-y-2">
                  {latestWeeklyData.bullets.map((bullet, idx) => (
                    <div key={bullet.id || idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${currentAccent.bulletDot}`} />
                      <p className="line-clamp-2 leading-relaxed flex-1">
                        {bullet.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : latestWeeklyData.therapistNotes ? (
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 italic line-clamp-3 leading-relaxed">
                  "{latestWeeklyData.therapistNotes}"
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 italic">
                  Entry created. Tap below to write down your thoughts and reflections for this week.
                </p>
              )}
            </div>

            {/* Action / Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-white/5 text-xs">
              <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Jump straight into editor</span>
              </span>

              <div className={`flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform ${currentAccent.textPrimary}`}>
                <span>Open Full Week</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ) : (
          /* Empty placeholder */
          <div className="w-full rounded-2xl bg-white dark:bg-[#18181b] border border-dashed border-neutral-300 dark:border-white/10 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-white/5 mx-auto flex items-center justify-center text-neutral-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                No recent entries yet.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Tap below to start your first weekly reflection block.
              </p>
            </div>
            {onAddNewWeek && (
              <button
                type="button"
                onClick={onAddNewWeek}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs ${currentAccent.buttonPrimary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start This Week's Journal</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Customize Pinned Topics Modal */}
      <CustomizePinnedTopicsModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        categories={coreCategories}
        coreItems={coreItems}
        pinnedCategoryIds={pinnedCategoryIds}
        onSavePinned={handleSavePinned}
        accentTheme={accentTheme}
      />
    </div>
  );
});
