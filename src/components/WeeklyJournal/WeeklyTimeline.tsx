import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import { AccentTheme, BulletPoint, CommentItem, FilterOptions, WeeklyBlock } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { WeekCard } from './WeekCard';

interface WeeklyTimelineProps {
  weeks: WeeklyBlock[];
  setWeeks: React.Dispatch<React.SetStateAction<WeeklyBlock[]>>;
  activeWeekId: string;
  setActiveWeekId: (id: string) => void;
  filters: FilterOptions;
  setFilters?: React.Dispatch<React.SetStateAction<FilterOptions>>;
  accentTheme?: AccentTheme;
  currentUser: CurrentUserProfile;
  comments?: CommentItem[];
  onOpenCommentSection?: (sectionTag?: string, itemId?: string, targetType?: 'weekly' | 'core', targetId?: string) => void;
  activeCommentSectionTag?: string;
  onTogglePinTakeaway?: (bullet: BulletPoint, week: WeeklyBlock) => void;
}

export const WeeklyTimeline: React.FC<WeeklyTimelineProps> = React.memo(({
  weeks,
  setWeeks,
  activeWeekId,
  setActiveWeekId,
  filters,
  setFilters,
  accentTheme = 'blue',
  currentUser,
  comments = [],
  onOpenCommentSection,
  activeCommentSectionTag,
  onTogglePinTakeaway,
}) => {
  const themeConfig = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  // Filter weeks
  const filteredWeeks = useMemo(() => {
    return weeks.filter((week) => {
      if (filters.hasMediaOnly) {
        const hasMedia = week.bullets.some((b) => b.mediaUrl);
        if (!hasMedia) return false;
      }

      if (filters.hasTherapistAnswersOnly) {
        const hasAnswer =
          week.bullets.some((b) => b.isAnswerHighlight) ||
          week.assignments.desQuestions.some((q) => q.highlightAnswer) ||
          week.therapistSection.itemsToShow.some((i) => i.isHighlightedAnswer);
        if (!hasAnswer) return false;
      }

      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const inTitle = week.weekTitle.toLowerCase().includes(query);
        const inBullets = week.bullets.some((b) => b.text.toLowerCase().includes(query));
        const inBook = week.assignments.readBookTitle.toLowerCase().includes(query);
        const inMovie = week.assignments.watchMovieTitle.toLowerCase().includes(query);
        const inDesQ = week.assignments.desQuestions.some(
          (q) => q.question.toLowerCase().includes(query) || q.answer.toLowerCase().includes(query)
        );
        return inTitle || inBullets || inBook || inMovie || inDesQ;
      }

      return true;
    });
  }, [weeks, filters.hasMediaOnly, filters.hasTherapistAnswersOnly, filters.searchQuery]);

  const activeIndex = useMemo(() => {
    const idx = filteredWeeks.findIndex((w) => w.id === activeWeekId);
    return idx >= 0 ? idx : 0;
  }, [filteredWeeks, activeWeekId]);

  useEffect(() => {
    if (filteredWeeks.length > 0 && !filteredWeeks.some((w) => w.id === activeWeekId)) {
      setActiveWeekId(filteredWeeks[0].id);
    }
  }, [filteredWeeks, activeWeekId, setActiveWeekId]);

  const currentWeek = filteredWeeks[activeIndex] || filteredWeeks[0];

  const handlePrevWeek = useCallback(() => {
    if (activeIndex > 0) {
      setActiveWeekId(filteredWeeks[activeIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeIndex, filteredWeeks, setActiveWeekId]);

  const handleNextWeek = useCallback(() => {
    if (activeIndex < filteredWeeks.length - 1) {
      setActiveWeekId(filteredWeeks[activeIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeIndex, filteredWeeks, setActiveWeekId]);

  const handleUpdateWeek = useCallback((updated: WeeklyBlock) => {
    setWeeks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, [setWeeks]);

  const handleDeleteWeek = useCallback((id: string) => {
    setWeeks((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      if (activeWeekId === id && updated.length > 0) {
        setActiveWeekId(updated[0].id);
      }
      return updated;
    });
  }, [activeWeekId, setActiveWeekId, setWeeks]);

  const handleClearSearch = useCallback(() => {
    if (setFilters) {
      setFilters((prev) => ({ ...prev, searchQuery: '' }));
    }
  }, [setFilters]);

  // Clean empty state
  if (!currentWeek || filteredWeeks.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-xs space-y-2 max-w-lg mx-auto">
        <Calendar className="w-8 h-8 text-stone-400 mx-auto" />
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
          {filters.searchQuery ? `No results for "${filters.searchQuery}"` : 'No Entries'}
        </h3>
        {filters.searchQuery && (
          <div className="pt-2">
            <button
              onClick={handleClearSearch}
              className="px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-stone-900 dark:text-stone-100 text-xs font-semibold rounded-xl transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    );
  }

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === filteredWeeks.length - 1;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Single-Week Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#1C1C1E] px-3 sm:px-4 py-2 rounded-2xl border border-black/5 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevWeek}
            disabled={isFirst}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextWeek}
            disabled={isLast}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
            {currentWeek.weekTitle}
          </span>
          <span className="text-[10px] sm:text-[11px] text-stone-400 font-mono">
            ({activeIndex + 1}/{filteredWeeks.length})
          </span>
        </div>

        <div className="text-[10px] sm:text-[11px] text-stone-400 font-mono text-right truncate max-w-[120px] sm:max-w-none">
          {currentWeek.startDate || currentWeek.endDate ? `${currentWeek.startDate} – ${currentWeek.endDate}` : ''}
        </div>
      </div>

      {/* Render ONLY the single active week block */}
      <WeekCard
        key={currentWeek.id}
        week={currentWeek}
        onUpdateWeek={handleUpdateWeek}
        onDeleteWeek={() => handleDeleteWeek(currentWeek.id)}
        accentTheme={accentTheme}
        currentUser={currentUser}
        commentsCount={comments.filter((c) => c.targetType === 'weekly' && c.targetId === currentWeek.id).length}
        onOpenCommentSection={onOpenCommentSection}
        activeCommentSectionTag={activeCommentSectionTag}
        onTogglePinTakeaway={onTogglePinTakeaway}
        searchQuery={filters.searchQuery}
      />
    </div>
  );
});
