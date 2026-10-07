import {
  Bookmark,
  BookOpenCheck,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Film,
  Folder,
  FolderOpen,
  GitMerge,
  Heart,
  HeartHandshake,
  HelpCircle,
  History,
  Home,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { CurrentUserProfile } from '../lib/firebase';
import { AccentTheme, CoreCategoryConfig, CoreCategoryId, ViewMode, WeeklyBlock } from '../types';
import { ACCENT_THEMES } from '../utils/theme';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { EditCoreCategoryModal } from './CoreSections/EditCoreCategoryModal';
import { usePermissions } from '../hooks/usePermissions';
import {
  findMatchingWeekForDate,
  findOverlappingWeek,
  isDateWithinWeek,
  sortWeeksForSidebar,
  formatWeekDateRange,
  groupWeeksByMonth,
  isCurrentWeek,
  normalizeDateToIso,
} from '../utils/dateUtils';
import { getWeekTitleAndRangeForDate, parseDateFromTimestamp } from '../utils/storage';
import { useJournalStore } from '../store/useJournalStore';
import { MergeWeekModal } from './WeeklyJournal/MergeWeekModal';

interface SidebarProps {
  weeks: WeeklyBlock[];
  activeWeekId: string;
  onSelectWeek?: (weekId: string) => void;
  setActiveWeekId?: (weekId: string) => void;
  onAddWeek?: (week: WeeklyBlock) => void;
  onReorderWeeks?: (weeks: WeeklyBlock[]) => void;
  accentTheme: AccentTheme;
  currentUser: CurrentUserProfile;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  coreCategories?: CoreCategoryConfig[];
  activeCoreCategory?: CoreCategoryId;
  onSelectCoreCategory?: (catId: CoreCategoryId) => void;
  setActiveCoreCategory?: (catId: CoreCategoryId) => void;
  onAddCoreCategory?: (category: CoreCategoryConfig) => void;
  onUpdateCoreCategory?: (catId: CoreCategoryId, updated: Partial<CoreCategoryConfig>) => void;
  onDeleteCoreCategory?: (catId: CoreCategoryId) => void;
  onReorderCoreCategories?: (categories: CoreCategoryConfig[]) => void;
  pinnedCategoryIds?: string[];
  onTogglePinCategory?: (categoryId: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isOpenMobile?: boolean;
  setIsOpenMobile?: (open: boolean) => void;
  filters?: any;
  coreItems?: any;
}

const ICON_MAP: Record<string, React.ElementType> = {
  HelpCircle,
  MessageSquare,
  MessageSquareText,
  MessageCircle,
  BookOpenCheck,
  HeartHandshake,
  ShoppingBag,
  Utensils,
  Compass,
  Heart,
  Sparkles,
  History,
  Bookmark,
  CheckSquare,
  Tag,
  Folder,
  FolderOpen,
  Calendar,
};

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  weeks,
  activeWeekId,
  onSelectWeek,
  setActiveWeekId,
  onAddWeek,
  onReorderWeeks,
  accentTheme,
  currentUser,
  viewMode,
  setViewMode,
  coreCategories = [],
  activeCoreCategory,
  onSelectCoreCategory,
  setActiveCoreCategory,
  onAddCoreCategory,
  onUpdateCoreCategory,
  onDeleteCoreCategory,
  onReorderCoreCategories,
  pinnedCategoryIds = [],
  onTogglePinCategory,
  isSidebarOpen = true,
  isOpenMobile = false,
  setIsOpenMobile,
  coreItems = [],
}) => {
  const [showAddWeekModal, setShowAddWeekModal] = useState(false);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [newWeekEndDate, setNewWeekEndDate] = useState('');
  const [weekSearchQuery, setWeekSearchQuery] = useState('');

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CoreCategoryConfig | null>(null);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Folder');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [dragOverCatIndex, setDragOverCatIndex] = useState<number | null>(null);
  const [openWeekMenuId, setOpenWeekMenuId] = useState<string | null>(null);
  const [mergingWeek, setMergingWeek] = useState<WeeklyBlock | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    catId: CoreCategoryId;
    title: string;
    x: number;
    y: number;
  } | null>(null);

  const startThisWeek = useJournalStore((s) => s.startThisWeek);
  const deleteWeek = useJournalStore((s) => s.deleteWeek);
  const togglePinWeek = useJournalStore((s) => s.togglePinWeek);
  const mergeWeekInto = useJournalStore((s) => s.mergeWeekInto);
  const setIsRecentlyDeletedOpen = useJournalStore((s) => s.setIsRecentlyDeletedOpen);
  const allStoreWeeks = useJournalStore((s) => s.weeks);
  const allStoreCategories = useJournalStore((s) => s.coreCategories);
  const allStoreCoreItems = useJournalStore((s) => s.coreItems);

  // Remember expanded/collapsed state per device
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('weekly_sidebar_expanded_months');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  const { currentMonthKey, prevMonthKey } = useMemo(() => {
    const now = new Date();
    const cKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const pDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const pKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
    return { currentMonthKey: cKey, prevMonthKey: pKey };
  }, []);

  const toggleMonth = useCallback(
    (monthKey: string) => {
      setExpandedMonths((prev) => {
        const isCurrentlyExpanded =
          prev[monthKey] !== undefined
            ? prev[monthKey]
            : monthKey === currentMonthKey || monthKey === prevMonthKey;
        const updated = {
          ...prev,
          [monthKey]: !isCurrentlyExpanded,
        };
        try {
          localStorage.setItem('weekly_sidebar_expanded_months', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [currentMonthKey, prevMonthKey]
  );

  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const permissions = usePermissions();
  const isOwner = permissions.isOwner;
  const canEdit = permissions.canEdit;
  const { confirmDelete } = useConfirmDelete();

  const handleSelectWeek = useCallback(
    (wId: string) => {
      if (onSelectWeek) onSelectWeek(wId);
      else if (setActiveWeekId) setActiveWeekId(wId);
      if (setIsOpenMobile) setIsOpenMobile(false);
    },
    [onSelectWeek, setActiveWeekId, setIsOpenMobile]
  );

  const handleSelectCategory = useCallback(
    (cId: CoreCategoryId) => {
      if (onSelectCoreCategory) onSelectCoreCategory(cId);
      else if (setActiveCoreCategory) setActiveCoreCategory(cId);
      if (setIsOpenMobile) setIsOpenMobile(false);
    },
    [onSelectCoreCategory, setActiveCoreCategory, setIsOpenMobile]
  );

  const activeWeeks = useMemo(() => {
    return weeks.filter((w) => !w.deletedAt);
  }, [weeks]);

  const activeCategories = useMemo(() => {
    return coreCategories.filter((c) => !c.deletedAt);
  }, [coreCategories]);

  const filteredWeeks = useMemo(() => {
    let list = activeWeeks;
    if (weekSearchQuery.trim()) {
      const q = weekSearchQuery.toLowerCase();
      list = activeWeeks.filter(
        (w) =>
          w.weekTitle.toLowerCase().includes(q) ||
          (w.startDate && w.startDate.toLowerCase().includes(q)) ||
          (w.endDate && w.endDate.toLowerCase().includes(q))
      );
    }
    return sortWeeksForSidebar(list);
  }, [activeWeeks, weekSearchQuery]);

  const pinnedWeeks = useMemo(() => {
    return filteredWeeks.filter((w) => Boolean(w.isPinned));
  }, [filteredWeeks]);

  const unpinnedWeeks = useMemo(() => {
    return filteredWeeks.filter((w) => !w.isPinned);
  }, [filteredWeeks]);

  const monthGroups = useMemo(() => {
    return groupWeeksByMonth(unpinnedWeeks);
  }, [unpinnedWeeks]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return activeCategories;
    const q = categorySearchQuery.toLowerCase();
    return activeCategories.filter((c) => c.title.toLowerCase().includes(q));
  }, [activeCategories, categorySearchQuery]);

  const recentlyDeletedCount = useMemo(() => {
    const deletedWeeksCount = allStoreWeeks.filter((w) => !!w.deletedAt).length;
    let deletedEntriesCount = 0;
    allStoreWeeks.forEach((w) => {
      (w.bullets || []).forEach((b) => {
        if (b.deletedAt) deletedEntriesCount++;
      });
    });
    const deletedFoldersCount = allStoreCategories.filter((c) => !!c.deletedAt).length;
    const deletedNotesCount = (allStoreCoreItems || []).filter((i) => !!i.deletedAt).length;
    return deletedWeeksCount + deletedEntriesCount + deletedFoldersCount + deletedNotesCount;
  }, [allStoreWeeks, allStoreCategories, allStoreCoreItems]);

  const moveCategory = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!onReorderCoreCategories || toIdx < 0 || toIdx >= coreCategories.length || fromIdx === toIdx) return;
      const reordered = [...coreCategories];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      onReorderCoreCategories(reordered);
    },
    [coreCategories, onReorderCoreCategories]
  );

  const handleCreateWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeekTitle.trim() && !newWeekStartDate) return;

    const targetDate = parseDateFromTimestamp(newWeekStartDate || newWeekTitle);
    const { weekTitle: calcTitle, startDate: calcStart, endDate: calcEnd } = getWeekTitleAndRangeForDate(
      !isNaN(targetDate.getTime()) ? targetDate : new Date()
    );

    const finalTitle = newWeekTitle.trim() || calcTitle;
    const finalStartDate = normalizeDateToIso(newWeekStartDate || calcStart);
    const finalEndDate = normalizeDateToIso(newWeekEndDate || calcEnd);

    // Check if an existing week matches the exact dates, week title, or covers the target date range
    const existingWeek = findOverlappingWeek(
      finalStartDate,
      finalEndDate,
      finalTitle,
      undefined,
      activeWeeks
    );

    if (existingWeek) {
      handleSelectWeek(existingWeek.id);
      setShowAddWeekModal(false);
      setNewWeekTitle('');
      setNewWeekStartDate('');
      setNewWeekEndDate('');
      useJournalStore.getState().showToast(`Week already exists: opened "${existingWeek.weekTitle}"`);
      return;
    }

    const newWeek: WeeklyBlock = {
      id: 'week-' + Date.now(),
      weekTitle: finalTitle,
      startDate: finalStartDate,
      endDate: finalEndDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bullets: [],
      assignments: {
        readBookEnabled: false,
        readBookTitle: '',
        readBookProgress: '',
        watchMovieEnabled: false,
        watchMovieTitle: '',
        watchMovieThoughts: '',
        answerDesQuestionsEnabled: false,
        desQuestions: [],
      },
      therapistSection: {
        title: 'Session Notes',
        notes: '',
        externalLinks: [],
        itemsToShow: [],
      },
    };

    onAddWeek?.(newWeek);
    handleSelectWeek(newWeek.id);
    setShowAddWeekModal(false);
    setNewWeekTitle('');
    setNewWeekStartDate('');
    setNewWeekEndDate('');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim() || !onAddCoreCategory) return;

    const newCat: CoreCategoryConfig = {
      id: 'topic-' + Date.now(),
      title: newCatTitle.trim(),
      description: '',
      iconName: newCatIcon,
    };

    onAddCoreCategory(newCat);
    handleSelectCategory(newCat.id);
    setShowAddCategoryModal(false);
    setNewCatTitle('');
  };

  const renderWeekRow = (week: WeeklyBlock) => {
    const isSelected = activeWeekId === week.id;
    const isCurrent = isCurrentWeek(week);
    const entryCount = (week.bullets || []).filter((b) => !b.deletedAt).length;
    const dateRange = formatWeekDateRange(week.startDate, week.endDate);
    const countText = `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`;
    const subtitle = dateRange ? `${dateRange} · ${countText}` : countText;

    return (
      <div
        key={week.id}
        className={`group shrink-0 flex items-center justify-between px-3 py-2 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer select-none active:scale-[0.99] ${
          isSelected
            ? 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
            : 'text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
        onClick={() => handleSelectWeek(week.id)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {week.isPinned && (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <p className="truncate text-xs sm:text-xs font-medium">{week.weekTitle}</p>
          </div>
          <p className="text-[10px] text-stone-400 dark:text-stone-400 font-mono truncate mt-0.5">
            <span>{subtitle}</span>
            {isCurrent && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold"> · this week</span>
            )}
          </p>
        </div>

        {canEdit && (
          <div className="relative shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenWeekMenuId(openWeekMenuId === week.id ? null : week.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
              title="Week options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {openWeekMenuId === week.id && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOpenWeekMenuId(null)} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-1 min-w-[150px] text-xs font-normal">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenWeekMenuId(null);
                      togglePinWeek(week.id);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 text-stone-700 dark:text-stone-200 cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{week.isPinned ? 'Unpin week' : 'Pin week'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenWeekMenuId(null);
                      setMergingWeek(week);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 text-stone-700 dark:text-stone-200 cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-amber-500" />
                    <span>Merge into…</span>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenWeekMenuId(null);
                        confirmDelete({
                          title: `Delete "${week.weekTitle}"?`,
                          message: `Delete this week and all entries inside it?`,
                          confirmText: 'Delete',
                          onConfirm: () => deleteWeek(week.id),
                        });
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Week</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarContent = (isMobileView = false) => (
    <>
      {/* Mobile Drawer Header */}
      {isMobileView && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs"
              style={{ backgroundColor: currentAccent.colorHex }}
            >
              J
            </div>
            <span className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Navigation
            </span>
          </div>
          <button
            onClick={() => setIsOpenMobile?.(false)}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Apple-style Segmented Control */}
      <div className="flex bg-black/5 dark:bg-white/10 p-0.5 rounded-xl mb-3 shrink-0">
        <button
          onClick={() => {
            setViewMode('home');
            if (isMobileView && setIsOpenMobile) setIsOpenMobile(false);
          }}
          className={`flex-1 min-h-[38px] py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1 transition-all ${
            viewMode === 'home'
              ? 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => {
            setViewMode('weekly');
          }}
          className={`flex-1 min-h-[38px] py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1 transition-all ${
            viewMode === 'weekly'
              ? 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Weekly</span>
        </button>
        <button
          onClick={() => {
            setViewMode('core');
          }}
          className={`flex-1 min-h-[38px] py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1 transition-all ${
            viewMode === 'core'
              ? 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Topics</span>
        </button>
        <button
          onClick={() => {
            setViewMode('media');
          }}
          className={`flex-1 min-h-[38px] py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1 transition-all ${
            viewMode === 'media'
              ? 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>
      </div>

      {/* View Mode 0: Home Quick Overview Panel */}
      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3 text-xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-stone-400">Quick Navigation</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1">
            <button
              onClick={() => {
                setViewMode('weekly');
                if (isMobileView && setIsOpenMobile) setIsOpenMobile(false);
              }}
              className="w-full text-left p-3 rounded-xl bg-white dark:bg-[#1C1C1E] hover:bg-stone-100/90 dark:hover:bg-white/[0.07] border border-stone-200/80 dark:border-white/5 transition-all text-stone-700 dark:text-stone-200 flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">Weekly Journal</p>
                  <p className="text-[11px] text-stone-400">{weeks.length} total entries</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setViewMode('core');
                if (isMobileView && setIsOpenMobile) setIsOpenMobile(false);
              }}
              className="w-full text-left p-3 rounded-xl bg-white dark:bg-[#1C1C1E] hover:bg-stone-100/90 dark:hover:bg-white/[0.07] border border-stone-200/80 dark:border-white/5 transition-all text-stone-700 dark:text-stone-200 flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}>
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">Topic Folders</p>
                  <p className="text-[11px] text-stone-400">{coreCategories.length} categories</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setViewMode('media');
                if (isMobileView && setIsOpenMobile) setIsOpenMobile(false);
              }}
              className="w-full text-left p-3 rounded-xl bg-white dark:bg-[#1C1C1E] hover:bg-stone-100/90 dark:hover:bg-white/[0.07] border border-stone-200/80 dark:border-white/5 transition-all text-stone-700 dark:text-stone-200 flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}>
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">Media Hub</p>
                  <p className="text-[11px] text-stone-400">Photos & Attachments</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* View Mode 1: Weekly Entries List */}
      {viewMode === 'weekly' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-1 mb-2 shrink-0">
            <span className="text-xs font-semibold text-stone-400">Entries</span>
            {canEdit && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    startThisWeek();
                    if (isMobileView && setIsOpenMobile) setIsOpenMobile(false);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Start or open the current Monday–Sunday week"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Start this week</span>
                </button>
                <button
                  onClick={() => setShowAddWeekModal(true)}
                  className="min-h-[32px] min-w-[32px] p-1.5 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="New Week"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Filter */}
          {weeks.length > 5 && (
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter..."
                value={weekSearchQuery}
                onChange={(e) => setWeekSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
            </div>
          )}

          {/* Weekly Items List */}
          <div className="space-y-1 overflow-y-auto pr-0.5 flex-1">
            {filteredWeeks.length === 0 ? (
              <p className="text-xs text-stone-400 p-4 text-center">No entries</p>
            ) : (
              <>
                {/* 1. Pinned Section at the Top */}
                {pinnedWeeks.length > 0 && (
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500 select-none">
                      <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      <span>PINNED</span>
                      <span className="text-[10px] text-stone-400 font-mono">({pinnedWeeks.length})</span>
                    </div>
                    <div className="space-y-1">
                      {pinnedWeeks.map((week) => renderWeekRow(week))}
                    </div>
                  </div>
                )}

                {/* 2. Unpinned Weeks Grouped by Month */}
                {monthGroups.map((group) => {
                  const isMonthExpanded =
                    Boolean(weekSearchQuery.trim()) ||
                    (expandedMonths[group.monthKey] !== undefined
                      ? expandedMonths[group.monthKey]
                      : group.monthKey === currentMonthKey || group.monthKey === prevMonthKey);

                  const weekCount = group.weeks.length;
                  const countLabel = weekCount === 1 ? '1 WEEK' : `${weekCount} WEEKS`;

                  return (
                    <div key={group.monthKey} className="space-y-1 mb-2">
                      <button
                        type="button"
                        onClick={() => toggleMonth(group.monthKey)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer select-none"
                        aria-expanded={isMonthExpanded}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isMonthExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 group-hover:text-stone-600 dark:group-hover:text-stone-300" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0 group-hover:text-stone-600 dark:group-hover:text-stone-300" />
                          )}
                          <span className="text-[11px] font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200 truncate font-mono">
                            {isMonthExpanded ? group.monthTitle : `${group.monthTitle} · ${countLabel}`}
                          </span>
                        </div>
                        {isMonthExpanded && (
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono shrink-0 ml-1">
                            ({weekCount})
                          </span>
                        )}
                      </button>

                      {isMonthExpanded && (
                        <div className="space-y-1">
                          {group.weeks.map((week) => renderWeekRow(week))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* View Mode 2: Topic Folders List (2-Column Grid) */}
      {viewMode === 'core' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-1 mb-2.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-400">Folders</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400 font-medium">
                {filteredCategories.length}
              </span>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className={`w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-stone-600 dark:text-stone-300 transition-colors shadow-2xs ${currentAccent.hoverText}`}
                title="New Folder (+)"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Quick Filter */}
          {coreCategories.length > 6 && (
            <div className="relative mb-2.5 shrink-0 px-0.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter folders..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
            </div>
          )}

          {/* Full-Width Single-Column List Rows with Horizontal Card Structure */}
          <div className="flex flex-col gap-2.5 w-full overflow-y-auto p-1 pr-1 pb-16 sm:pb-6 flex-1 content-start">
            {filteredCategories.length === 0 ? (
              <div className="py-8 text-center w-full">
                <Folder className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2 stroke-[1.5]" />
                <p className="text-xs text-stone-400">No topic folders</p>
              </div>
            ) : (
              filteredCategories.map((config, index) => {
                const IconComp = ICON_MAP[config.iconName] || Folder;
                const isSelected = activeCoreCategory === config.id;
                const isDragged = draggedCatIndex === index;
                const itemCount = Array.isArray(coreItems)
                  ? coreItems.filter((item: any) => item.categoryId === config.id).length
                  : 0;

                return (
                  <div
                    key={config.id}
                    draggable={canEdit}
                    onDragStart={() => canEdit && setDraggedCatIndex(index)}
                    onDragOver={(e) => {
                      if (!canEdit) return;
                      e.preventDefault();
                      setDragOverCatIndex(index);
                    }}
                    onDrop={() => {
                      if (!canEdit || draggedCatIndex === null) return;
                      moveCategory(draggedCatIndex, index);
                      setDraggedCatIndex(null);
                      setDragOverCatIndex(null);
                    }}
                    onContextMenu={(e) => {
                      if (!isOwner) return;
                      e.preventDefault();
                      setContextMenu({
                        catId: config.id,
                        title: config.title,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onClick={() => handleSelectCategory(config.id)}
                    className={`group relative w-full shrink-0 h-auto min-h-[52px] py-2.5 px-3.5 rounded-xl transition-all duration-150 ease-out cursor-pointer select-none text-left border flex items-center justify-between gap-3 box-border ${
                      isSelected
                        ? `${currentAccent.activeBorder} ${currentAccent.iconBoxSelected} shadow-2xs text-stone-900 dark:text-stone-100`
                        : 'bg-stone-100/80 hover:bg-stone-200/80 active:bg-stone-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:active:bg-white/[0.12] border-stone-200/80 dark:border-white/5 text-stone-700 dark:text-stone-300'
                    } ${isDragged ? 'opacity-30' : ''} ${dragOverCatIndex === index ? `ring-2 ${currentAccent.ring}` : ''}`}
                  >
                    {/* Left Section: Icon + Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 py-0.5">
                      <span
                        className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                          isSelected
                            ? currentAccent.iconBoxSelected
                            : `${currentAccent.iconBox} ${currentAccent.iconBoxHover}`
                        }`}
                      >
                        <IconComp className="w-4 h-4 shrink-0" />
                      </span>

                      <span
                        className={`text-sm font-medium text-left leading-snug break-words whitespace-normal flex-1 ${
                          isSelected
                            ? 'text-stone-900 dark:text-stone-100 font-semibold'
                            : 'text-stone-700 dark:text-neutral-200 group-hover:text-stone-900 dark:group-hover:text-stone-100'
                        }`}
                        title={config.title}
                      >
                        {config.title}
                      </span>
                    </div>

                    {/* Right Section: Item Counter / Actions / Chevron */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {itemCount > 0 && (
                        <span className="text-[11px] font-medium text-stone-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                          {itemCount} {itemCount === 1 ? 'note' : 'notes'}
                        </span>
                      )}

                      {/* Discreet options button */}
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setContextMenu({
                              catId: config.id,
                              title: config.title,
                              x: rect.right,
                              y: rect.bottom,
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity shrink-0"
                          title="Folder options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <ChevronRight className="w-4 h-4 text-stone-400 dark:text-neutral-500 shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* View Mode 3: Media Quick Links */}
      {viewMode === 'media' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-2 text-xs">
          <span className="text-xs font-semibold text-stone-400 px-1">Shared Media</span>
          <div className="space-y-1">
            <button
              onClick={() => {
                setViewMode('media');
                if (setIsOpenMobile) setIsOpenMobile(false);
              }}
              className="w-full shrink-0 text-left px-3 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Film className={`w-4 h-4 ${currentAccent.textPrimary}`} />
                <span>All Media</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer: Recently Deleted & Backup status */}
      <div className="mt-auto pt-3 border-t border-black/5 dark:border-white/10 shrink-0 space-y-1">
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setIsRecentlyDeletedOpen(true);
              if (isMobileView && setIsOpenMobile) setIsOpenMobile(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors" />
              <span>Recently deleted</span>
            </div>
            {recentlyDeletedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                {recentlyDeletedCount}
              </span>
            )}
          </button>
        )}
        <div className="px-3 pb-1 text-[10px] text-stone-400 dark:text-stone-500 font-medium select-none">
          Daily backup
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on screens < md) with spacious width for 2-column grid */}
      <aside
        id="main-desktop-sidebar"
        className={`hidden md:flex border-r border-black/5 dark:border-white/10 bg-[#F2F2F7]/50 dark:bg-black/50 h-[calc(100dvh-3.5rem)] sticky top-14 flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? 'w-80 lg:w-88 xl:w-96 p-3 opacity-100 translate-x-0'
            : 'w-0 p-0 opacity-0 -translate-x-full border-r-0 overflow-hidden pointer-events-none'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer (visible on screens < md when isOpenMobile is true) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 transition-opacity duration-200"
            style={{
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              transform: 'translateZ(0)',
            }}
            onClick={() => setIsOpenMobile?.(false)}
          />

          {/* Drawer Content with clean mobile width and safe area insets */}
          <div
            className="relative w-full max-w-[340px] bg-[#F2F2F7] dark:bg-[#1C1C1E] h-full shadow-2xl p-3.5 sm:p-4 flex flex-col pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] z-10"
            style={{
              contain: 'layout paint',
              transform: 'translateZ(0)',
            }}
          >
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Add Week Modal */}
      {showAddWeekModal && (
        <div
          id="add-week-modal-overlay"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            transform: 'translateZ(0)',
          }}
          onClick={() => setShowAddWeekModal(false)}
        >
          <div
            className="bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5"
            style={{
              contain: 'layout paint',
              transform: 'translateZ(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">New Week</h3>
              <button
                onClick={() => setShowAddWeekModal(false)}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWeek} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Title (e.g. Week 12)"
                value={newWeekTitle}
                onChange={(e) => setNewWeekTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newWeekStartDate}
                  onChange={(e) => setNewWeekStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100"
                />
                <input
                  type="date"
                  value={newWeekEndDate}
                  onChange={(e) => setNewWeekEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWeekModal(false)}
                  className="min-h-[44px] px-4 py-2 text-sm sm:text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-sm sm:text-xs font-semibold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentAccent.colorHex }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Folder Modal */}
      {showAddCategoryModal && (
        <div
          id="add-sidebar-category-modal-overlay"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            transform: 'translateZ(0)',
          }}
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div
            className="bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5"
            style={{
              contain: 'layout paint',
              transform: 'translateZ(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">New Folder</h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Folder Name"
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="min-h-[44px] px-4 py-2 text-sm sm:text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-sm sm:text-xs font-semibold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentAccent.colorHex }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Right-Click / Options Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl p-1.5 w-48 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
            style={{
              top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 100 : 400),
              left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 200 : 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 font-semibold text-stone-500 dark:text-stone-400 text-[11px] truncate border-b border-black/5 dark:border-white/10 mb-1">
              {contextMenu.title}
            </div>

            {onTogglePinCategory && (
              <button
                onClick={() => {
                  const target = contextMenu;
                  setContextMenu(null);
                  onTogglePinCategory(target.catId);
                }}
                className="w-full px-3 py-2 text-left rounded-xl text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium transition-colors"
              >
                {pinnedCategoryIds.includes(contextMenu.catId) ? (
                  <>
                    <PinOff className={`w-4 h-4 ${currentAccent.textPrimary}`} />
                    <span>Unpin from Home</span>
                  </>
                ) : (
                  <>
                    <Pin className={`w-4 h-4 ${currentAccent.textPrimary}`} />
                    <span>Pin to Home</span>
                  </>
                )}
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  const target = contextMenu;
                  setContextMenu(null);
                  const foundCat = coreCategories.find((c) => c.id === target.catId);
                  if (foundCat) {
                    setEditingCategory(foundCat);
                  }
                }}
                className="w-full px-3 py-2 text-left rounded-xl text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium transition-colors"
              >
                <Pencil className={`w-4 h-4 ${currentAccent.textPrimary}`} />
                <span>Rename / Edit</span>
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => {
                  const target = contextMenu;
                  setContextMenu(null);
                  confirmDelete({
                    title: `Delete "${target.title}"?`,
                    message: `Are you sure you want to delete folder "${target.title}" and its entries?`,
                    confirmText: 'Delete Folder',
                    onConfirm: () => onDeleteCoreCategory?.(target.catId),
                  });
                }}
                className="w-full px-3 py-2 text-left rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Folder</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Edit Core Category Modal */}
      {editingCategory && (
        <EditCoreCategoryModal
          isOpen={!!editingCategory}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={(catId, updated) => {
            onUpdateCoreCategory?.(catId as CoreCategoryId, updated);
          }}
        />
      )}

      {/* Merge Week Modal */}
      {mergingWeek && (
        <MergeWeekModal
          isOpen={!!mergingWeek}
          sourceWeek={mergingWeek}
          onClose={() => setMergingWeek(null)}
          onConfirmMerge={(targetWeekId) => {
            mergeWeekInto(mergingWeek.id, targetWeekId);
            setMergingWeek(null);
          }}
        />
      )}
    </>
  );
});
