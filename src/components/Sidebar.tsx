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
  FolderPlus,
  Heart,
  HeartHandshake,
  HelpCircle,
  History,
  Home,
  Layers,
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
import {
  AccentTheme,
  CategoryGroup,
  CoreCategoryConfig,
  CoreCategoryId,
  ViewMode,
  WeeklyBlock,
} from '../types';
import { ACCENT_THEMES } from '../utils/theme';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { EditCoreCategoryModal } from './CoreSections/EditCoreCategoryModal';

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
  categoryGroups?: CategoryGroup[];
  activeCoreCategory?: CoreCategoryId;
  onSelectCoreCategory?: (catId: CoreCategoryId) => void;
  setActiveCoreCategory?: (catId: CoreCategoryId) => void;
  onAddCoreCategory?: (category: CoreCategoryConfig) => void;
  onUpdateCoreCategory?: (catId: CoreCategoryId, updated: Partial<CoreCategoryConfig>) => void;
  onDeleteCoreCategory?: (catId: CoreCategoryId) => void;
  onReorderCoreCategories?: (categories: CoreCategoryConfig[]) => void;
  onAddCategoryGroup?: (group: CategoryGroup) => void;
  onUpdateCategoryGroup?: (groupId: string, updated: Partial<CategoryGroup>) => void;
  onDeleteCategoryGroup?: (groupId: string) => void;
  onReorderCategoryGroups?: (groups: CategoryGroup[]) => void;
  onSetCategoryFolderGroup?: (categoryId: string, groupId?: string) => void;
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
  Layers,
};

/**
 * Helper to parse month/year info from a week's startDate or createdAt
 */
function getWeekMonthYear(week: WeeklyBlock): { key: string; label: string; year: number; month: number } {
  let dateObj: Date | null = null;
  if (week.startDate && typeof week.startDate === 'string') {
    // Expected formats: YYYY-MM-DD or readable strings
    const parts = week.startDate.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        dateObj = new Date(y, m - 1, 1);
      }
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
      const parsed = Date.parse(week.startDate);
      if (!isNaN(parsed)) {
        dateObj = new Date(parsed);
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    if (week.createdAt) {
      const parsed = Date.parse(week.createdAt);
      if (!isNaN(parsed)) {
        dateObj = new Date(parsed);
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return { key, label, year, month };
}

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
  categoryGroups = [],
  activeCoreCategory,
  onSelectCoreCategory,
  setActiveCoreCategory,
  onAddCoreCategory,
  onUpdateCoreCategory,
  onDeleteCoreCategory,
  onReorderCoreCategories,
  onAddCategoryGroup,
  onUpdateCategoryGroup,
  onDeleteCategoryGroup,
  onReorderCategoryGroups,
  onSetCategoryFolderGroup,
  pinnedCategoryIds = [],
  onTogglePinCategory,
  isSidebarOpen = true,
  isOpenMobile = false,
  setIsOpenMobile,
  coreItems = [],
}) => {
  // Weekly modal & search
  const [showAddWeekModal, setShowAddWeekModal] = useState(false);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [newWeekEndDate, setNewWeekEndDate] = useState('');
  const [weekSearchQuery, setWeekSearchQuery] = useState('');

  // Topic Folder modals & search
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CoreCategoryConfig | null>(null);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Folder');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Custom Category Groups state & modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  // Collapsible state for Weekly Month/Year sections
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Collapsible state for Topic Category Groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isUngroupedCollapsed, setIsUngroupedCollapsed] = useState(false);

  // Drag-and-drop state for Weeks
  const [draggedWeekId, setDraggedWeekId] = useState<string | null>(null);
  const [dragOverWeekId, setDragOverWeekId] = useState<string | null>(null);

  // Drag-and-drop state for Folders & Groups
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    catId: CoreCategoryId;
    title: string;
    groupId?: string;
    x: number;
    y: number;
  } | null>(null);

  const [groupContextMenu, setGroupContextMenu] = useState<{
    groupId: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const isOwner = currentUser.role === 'owner';
  const canEdit = currentUser.role === 'owner' || currentUser.role === 'editor';
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

  // Filtered Weeks
  const filteredWeeks = useMemo(() => {
    if (!weekSearchQuery.trim()) return weeks;
    const q = weekSearchQuery.toLowerCase();
    return weeks.filter(
      (w) =>
        w.weekTitle.toLowerCase().includes(q) ||
        (w.startDate && w.startDate.toLowerCase().includes(q)) ||
        (w.endDate && w.endDate.toLowerCase().includes(q))
    );
  }, [weeks, weekSearchQuery]);

  // Current Month Key for default expansion calculation
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Group filtered weeks by month/year
  const { monthGroups, uniqueMonthCount } = useMemo(() => {
    const map = new Map<string, { key: string; label: string; year: number; month: number; weeks: WeeklyBlock[] }>();

    filteredWeeks.forEach((w) => {
      const { key, label, year, month } = getWeekMonthYear(w);
      if (!map.has(key)) {
        map.set(key, { key, label, year, month, weeks: [] });
      }
      map.get(key)!.weeks.push(w);
    });

    const groups = Array.from(map.values());
    return {
      monthGroups: groups,
      uniqueMonthCount: groups.length,
    };
  }, [filteredWeeks]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return coreCategories;
    const q = categorySearchQuery.toLowerCase();
    return coreCategories.filter((c) => c.title.toLowerCase().includes(q));
  }, [coreCategories, categorySearchQuery]);

  // Grouped Categories
  const { groupedCategoriesMap, ungroupedCategories } = useMemo(() => {
    const groupIds = new Set(categoryGroups.map((g) => g.id));
    const grouped = new Map<string, CoreCategoryConfig[]>();

    categoryGroups.forEach((g) => {
      grouped.set(g.id, []);
    });

    const ungrouped: CoreCategoryConfig[] = [];

    filteredCategories.forEach((c) => {
      if (c.groupId && groupIds.has(c.groupId)) {
        grouped.get(c.groupId)?.push(c);
      } else {
        ungrouped.push(c);
      }
    });

    return {
      groupedCategoriesMap: grouped,
      ungroupedCategories: ungrouped,
    };
  }, [filteredCategories, categoryGroups]);

  // Week Reordering
  const moveWeek = useCallback(
    (fromId: string, toId: string) => {
      if (!onReorderWeeks || fromId === toId) return;
      const fromIdx = weeks.findIndex((w) => w.id === fromId);
      const toIdx = weeks.findIndex((w) => w.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = [...weeks];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      onReorderWeeks(reordered);
    },
    [weeks, onReorderWeeks]
  );

  // Category Reordering & Moving
  const moveCategory = useCallback(
    (fromCatId: string, targetCatId: string) => {
      if (!onReorderCoreCategories || fromCatId === targetCatId) return;
      const fromIdx = coreCategories.findIndex((c) => c.id === fromCatId);
      const toIdx = coreCategories.findIndex((c) => c.id === targetCatId);
      if (fromIdx === -1 || toIdx === -1) return;

      const targetFolder = coreCategories[toIdx];
      const reordered = [...coreCategories];
      const [moved] = reordered.splice(fromIdx, 1);
      const updatedMoved = { ...moved, groupId: targetFolder.groupId };
      reordered.splice(toIdx, 0, updatedMoved);

      onReorderCoreCategories(reordered);
    },
    [coreCategories, onReorderCoreCategories]
  );

  // Group Reordering
  const moveGroup = useCallback(
    (fromGroupId: string, direction: 'up' | 'down') => {
      if (!onReorderCategoryGroups) return;
      const index = categoryGroups.findIndex((g) => g.id === fromGroupId);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= categoryGroups.length) return;

      const reordered = [...categoryGroups];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);
      onReorderCategoryGroups(reordered);
    },
    [categoryGroups, onReorderCategoryGroups]
  );

  const handleCreateWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeekTitle.trim()) return;

    const newWeek: WeeklyBlock = {
      id: 'week-' + Date.now(),
      weekTitle: newWeekTitle.trim(),
      startDate: newWeekStartDate || new Date().toISOString().split('T')[0],
      endDate: newWeekEndDate || new Date().toISOString().split('T')[0],
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

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !onAddCategoryGroup) return;

    const newGroup: CategoryGroup = {
      id: 'group-' + Date.now(),
      name: newGroupName.trim(),
      order: categoryGroups.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddCategoryGroup(newGroup);
    setShowAddGroupModal(false);
    setNewGroupName('');
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editingGroup.name.trim() || !onUpdateCategoryGroup) return;

    onUpdateCategoryGroup(editingGroup.id, {
      name: editingGroup.name.trim(),
    });
    setEditingGroup(null);
  };

  const isMonthExpanded = (monthKey: string) => {
    if (collapsedMonths[monthKey] !== undefined) {
      return !collapsedMonths[monthKey];
    }
    // Default: current month expanded, past months collapsed
    return monthKey === currentMonthKey;
  };

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !isMonthExpanded(monthKey),
    }));
  };

  const isGroupExpanded = (groupId: string) => {
    return collapsedGroups[groupId] !== true;
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: isGroupExpanded(groupId),
    }));
  };

  // Helper to render a single Week Item Row
  const renderWeekItem = (week: WeeklyBlock, index: number) => {
    const isSelected = activeWeekId === week.id;
    const isDragged = draggedWeekId === week.id;
    const isDragOver = dragOverWeekId === week.id;

    return (
      <div
        key={week.id}
        id={`sidebar-week-${week.id}`}
        draggable={canEdit}
        onDragStart={() => canEdit && setDraggedWeekId(week.id)}
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragOverWeekId(week.id);
        }}
        onDrop={() => {
          if (!canEdit || !draggedWeekId || draggedWeekId === week.id) return;
          moveWeek(draggedWeekId, week.id);
          setDraggedWeekId(null);
          setDragOverWeekId(null);
        }}
        className={`group shrink-0 flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-xl text-xs transition-all cursor-pointer select-none active:scale-[0.99] ${
          isSelected
            ? 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
            : 'text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-stone-200'
        } ${isDragged ? 'opacity-30' : ''} ${isDragOver ? `border-t-2 ${currentAccent.activeBorder}` : ''}`}
        onClick={() => handleSelectWeek(week.id)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{week.weekTitle}</p>
          {(week.startDate || week.endDate) && (
            <p className="text-[10px] text-stone-400 truncate mt-0.5">
              {week.startDate} {week.endDate && week.endDate !== week.startDate ? `– ${week.endDate}` : ''}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const curIdx = weeks.findIndex((w) => w.id === week.id);
                if (curIdx > 0) {
                  moveWeek(week.id, weeks[curIdx - 1].id);
                }
              }}
              disabled={weeks.findIndex((w) => w.id === week.id) === 0}
              className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
              title="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const curIdx = weeks.findIndex((w) => w.id === week.id);
                if (curIdx !== -1 && curIdx < weeks.length - 1) {
                  moveWeek(week.id, weeks[curIdx + 1].id);
                }
              }}
              disabled={weeks.findIndex((w) => w.id === week.id) === weeks.length - 1}
              className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
              title="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Helper to render a single Category Folder Card Row
  const renderCategoryCard = (config: CoreCategoryConfig, index: number) => {
    const IconComp = ICON_MAP[config.iconName] || Folder;
    const isSelected = activeCoreCategory === config.id;
    const isDragged = draggedCatId === config.id;
    const isDragOver = dragOverCatId === config.id;
    const itemCount = Array.isArray(coreItems)
      ? coreItems.filter((item: any) => item.categoryId === config.id).length
      : 0;

    return (
      <div
        key={config.id}
        id={`sidebar-folder-${config.id}`}
        draggable={canEdit}
        onDragStart={() => canEdit && setDraggedCatId(config.id)}
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragOverCatId(config.id);
        }}
        onDrop={() => {
          if (!canEdit || !draggedCatId || draggedCatId === config.id) return;
          moveCategory(draggedCatId, config.id);
          setDraggedCatId(null);
          setDragOverCatId(null);
        }}
        onContextMenu={(e) => {
          if (!isOwner) return;
          e.preventDefault();
          setContextMenu({
            catId: config.id,
            title: config.title,
            groupId: config.groupId,
            x: e.clientX,
            y: e.clientY,
          });
        }}
        onClick={() => handleSelectCategory(config.id)}
        className={`group relative w-full shrink-0 h-auto min-h-[48px] py-2 px-3 rounded-xl transition-all duration-150 ease-out cursor-pointer select-none text-left border flex items-center justify-between gap-2.5 box-border ${
          isSelected
            ? `${currentAccent.activeBorder} ${currentAccent.iconBoxSelected} shadow-2xs text-stone-900 dark:text-stone-100`
            : 'bg-stone-100/80 hover:bg-stone-200/80 active:bg-stone-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:active:bg-white/[0.12] border-stone-200/80 dark:border-white/5 text-stone-700 dark:text-stone-300'
        } ${isDragged ? 'opacity-30' : ''} ${isDragOver ? `ring-2 ${currentAccent.ring}` : ''}`}
      >
        {/* Left Section: Icon + Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 py-0.5">
          <span
            className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
              isSelected
                ? currentAccent.iconBoxSelected
                : `${currentAccent.iconBox} ${currentAccent.iconBoxHover}`
            }`}
          >
            <IconComp className="w-3.5 h-3.5 shrink-0" />
          </span>

          <span
            className={`text-xs font-medium text-left leading-snug break-words whitespace-normal flex-1 ${
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
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {itemCount > 0 && (
            <span className="text-[10px] font-medium text-stone-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">
              {itemCount}
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
                  groupId: config.groupId,
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

          <ChevronRight className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
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
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}
                >
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
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}
                >
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">Topic Folders</p>
                  <p className="text-[11px] text-stone-400">
                    {coreCategories.length} categories{categoryGroups.length > 0 ? ` in ${categoryGroups.length} groups` : ''}
                  </p>
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
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${currentAccent.iconBox} ${currentAccent.iconBoxHover}`}
                >
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

      {/* View Mode 1: Weekly Entries List (Collapsible Auto-Grouping by Month/Year) */}
      {viewMode === 'weekly' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-1 mb-2 shrink-0">
            <span className="text-xs font-semibold text-stone-400">Entries</span>
            {canEdit && (
              <button
                onClick={() => setShowAddWeekModal(true)}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="New Week"
              >
                <Plus className="w-4 h-4" />
              </button>
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
          <div className="space-y-2 overflow-y-auto pr-0.5 flex-1 pb-12 sm:pb-4">
            {filteredWeeks.length === 0 ? (
              <p className="text-xs text-stone-400 p-4 text-center">No entries</p>
            ) : uniqueMonthCount <= 1 ? (
              /* Single month or no multiple months -> Render flat list without group headers */
              <div className="space-y-1">
                {filteredWeeks.map((week, index) => renderWeekItem(week, index))}
              </div>
            ) : (
              /* Multiple months -> Render collapsible Month/Year sections */
              monthGroups.map((group) => {
                const expanded = isMonthExpanded(group.key);
                const hasActiveWeek = group.weeks.some((w) => w.id === activeWeekId);

                return (
                  <div key={group.key} className="rounded-xl overflow-hidden bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                    {/* Collapsible Month Section Header */}
                    <button
                      onClick={() => toggleMonth(group.key)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none ${
                        hasActiveWeek ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {expanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform" />
                        )}
                        <span className="text-xs font-semibold truncate">{group.label}</span>
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400 shrink-0">
                        {group.weeks.length}
                      </span>
                    </button>

                    {/* Month's Weeks List */}
                    {expanded && (
                      <div className="p-1 space-y-1 border-t border-black/5 dark:border-white/5">
                        {group.weeks.map((week, idx) => renderWeekItem(week, idx))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* View Mode 2: Topic Folders List (Custom Category Groups & Drag-and-Drop) */}
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className={`px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors shadow-2xs ${currentAccent.hoverText}`}
                  title="New Group (+)"
                >
                  <FolderPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[11px]">Group</span>
                </button>

                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className={`w-7 h-7 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-stone-600 dark:text-stone-300 transition-colors shadow-2xs ${currentAccent.hoverText}`}
                  title="New Folder (+)"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
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

          {/* Category Groups & Topic Folders List */}
          <div className="flex flex-col gap-2.5 w-full overflow-y-auto p-1 pr-1 pb-16 sm:pb-6 flex-1 content-start">
            {filteredCategories.length === 0 && categoryGroups.length === 0 ? (
              <div className="py-8 text-center w-full">
                <Folder className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2 stroke-[1.5]" />
                <p className="text-xs text-stone-400">No topic folders</p>
              </div>
            ) : categoryGroups.length === 0 ? (
              /* No custom groups created -> Flat list */
              filteredCategories.map((config, index) => renderCategoryCard(config, index))
            ) : (
              /* Custom Category Groups Defined */
              <>
                {categoryGroups.map((group, gIdx) => {
                  const groupFolders = groupedCategoriesMap.get(group.id) || [];
                  const isExpanded = isGroupExpanded(group.id);
                  const isDragOverGroup = dragOverGroupId === group.id;
                  const hasActiveFolder = groupFolders.some((f) => f.id === activeCoreCategory);

                  return (
                    <div
                      key={group.id}
                      id={`sidebar-group-${group.id}`}
                      onDragOver={(e) => {
                        if (!canEdit) return;
                        e.preventDefault();
                        setDragOverGroupId(group.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverGroupId === group.id) setDragOverGroupId(null);
                      }}
                      onDrop={(e) => {
                        if (!canEdit || !draggedCatId) return;
                        e.preventDefault();
                        onSetCategoryFolderGroup?.(draggedCatId, group.id);
                        setDraggedCatId(null);
                        setDragOverGroupId(null);
                      }}
                      className={`rounded-2xl border transition-all duration-150 overflow-hidden ${
                        isDragOverGroup
                          ? `ring-2 ${currentAccent.ring} border-amber-500 bg-amber-500/5`
                          : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'
                      }`}
                    >
                      {/* Group Header */}
                      <div
                        onClick={() => toggleGroup(group.id)}
                        className={`group flex items-center justify-between px-3 py-2 text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none ${
                          hasActiveFolder ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          )}
                          <Layers className={`w-3.5 h-3.5 shrink-0 ${hasActiveFolder ? currentAccent.textPrimary : 'text-stone-400'}`} />
                          <span className="text-xs font-semibold truncate">{group.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400">
                            {groupFolders.length}
                          </span>

                          {isOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setGroupContextMenu({
                                  groupId: group.id,
                                  name: group.name,
                                  x: rect.right,
                                  y: rect.bottom,
                                });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
                              title="Group options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Group Folder List */}
                      {isExpanded && (
                        <div className="p-1.5 space-y-1.5 border-t border-black/5 dark:border-white/5">
                          {groupFolders.length === 0 ? (
                            <div className="py-3 px-2 text-center text-[11px] text-stone-400 border border-dashed border-stone-200 dark:border-white/10 rounded-xl">
                              Drop folders here
                            </div>
                          ) : (
                            groupFolders.map((config, idx) => renderCategoryCard(config, idx))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ungrouped Folders Section */}
                {ungroupedCategories.length > 0 && (
                  <div
                    onDragOver={(e) => {
                      if (!canEdit) return;
                      e.preventDefault();
                      setDragOverGroupId('ungrouped');
                    }}
                    onDragLeave={() => {
                      if (dragOverGroupId === 'ungrouped') setDragOverGroupId(null);
                    }}
                    onDrop={(e) => {
                      if (!canEdit || !draggedCatId) return;
                      e.preventDefault();
                      onSetCategoryFolderGroup?.(draggedCatId, undefined);
                      setDraggedCatId(null);
                      setDragOverGroupId(null);
                    }}
                    className={`rounded-2xl border transition-all duration-150 overflow-hidden ${
                      dragOverGroupId === 'ungrouped'
                        ? `ring-2 ${currentAccent.ring} border-amber-500 bg-amber-500/5`
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'
                    }`}
                  >
                    <button
                      onClick={() => setIsUngroupedCollapsed(!isUngroupedCollapsed)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none text-stone-500 dark:text-stone-400"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {!isUngroupedCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold truncate">Ungrouped Folders</span>
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400 shrink-0">
                        {ungroupedCategories.length}
                      </span>
                    </button>

                    {!isUngroupedCollapsed && (
                      <div className="p-1.5 space-y-1.5 border-t border-black/5 dark:border-white/5">
                        {ungroupedCategories.map((config, idx) => renderCategoryCard(config, idx))}
                      </div>
                    )}
                  </div>
                )}
              </>
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on screens < md) with spacious width */}
      <aside
        id="main-desktop-sidebar"
        className={`hidden md:flex border-r border-black/5 dark:border-white/10 bg-[#F2F2F7]/50 dark:bg-black/50 h-[calc(100dvh-3.5rem)] sticky top-14 flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
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

      {/* Add Custom Category Group Modal */}
      {showAddGroupModal && (
        <div
          id="add-category-group-modal-overlay"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            transform: 'translateZ(0)',
          }}
          onClick={() => setShowAddGroupModal(false)}
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
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">New Category Group</h3>
              <button
                onClick={() => setShowAddGroupModal(false)}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Group Name (e.g. Relationship Topics)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="min-h-[44px] px-4 py-2 text-sm sm:text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-sm sm:text-xs font-semibold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentAccent.colorHex }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Group Modal */}
      {editingGroup && (
        <div
          id="edit-category-group-modal-overlay"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            transform: 'translateZ(0)',
          }}
          onClick={() => setEditingGroup(null)}
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
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">Rename Group</h3>
              <button
                onClick={() => setEditingGroup(null)}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGroup} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Group Name"
                value={editingGroup.name}
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="min-h-[44px] px-4 py-2 text-sm sm:text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-sm sm:text-xs font-semibold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentAccent.colorHex }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Right-Click / Options Context Menu for Category Folders */}
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
            className="fixed z-50 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl p-1.5 w-52 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
            style={{
              top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 200 : 400),
              left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 220 : 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 font-semibold text-stone-500 dark:text-stone-400 text-[11px] truncate border-b border-black/5 dark:border-white/10 mb-1">
              {contextMenu.title}
            </div>

            {/* Move to Group submenu / options */}
            {categoryGroups.length > 0 && onSetCategoryFolderGroup && (
              <div className="px-1 py-1 border-b border-black/5 dark:border-white/10 mb-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Move to Group
                </div>
                {contextMenu.groupId && (
                  <button
                    onClick={() => {
                      const target = contextMenu;
                      setContextMenu(null);
                      onSetCategoryFolderGroup(target.catId, undefined);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-lg text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium"
                  >
                    <span>None (Ungrouped)</span>
                  </button>
                )}
                {categoryGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      const target = contextMenu;
                      setContextMenu(null);
                      onSetCategoryFolderGroup(target.catId, g.id);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between font-medium ${
                      contextMenu.groupId === g.id
                        ? `${currentAccent.textPrimary} font-bold bg-black/5 dark:bg-white/5`
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    {contextMenu.groupId === g.id && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}

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

      {/* Floating Options Context Menu for Category Groups */}
      {groupContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setGroupContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setGroupContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl p-1.5 w-48 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
            style={{
              top: Math.min(groupContextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 150 : 400),
              left: Math.min(groupContextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 200 : 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 font-semibold text-stone-500 dark:text-stone-400 text-[11px] truncate border-b border-black/5 dark:border-white/10 mb-1">
              Group: {groupContextMenu.name}
            </div>

            {canEdit && (
              <>
                <button
                  onClick={() => {
                    const target = groupContextMenu;
                    setGroupContextMenu(null);
                    const found = categoryGroups.find((g) => g.id === target.groupId);
                    if (found) setEditingGroup(found);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium transition-colors"
                >
                  <Pencil className={`w-4 h-4 ${currentAccent.textPrimary}`} />
                  <span>Rename Group</span>
                </button>

                <button
                  onClick={() => {
                    const target = groupContextMenu;
                    setGroupContextMenu(null);
                    moveGroup(target.groupId, 'up');
                  }}
                  disabled={categoryGroups.findIndex((g) => g.id === groupContextMenu.groupId) === 0}
                  className="w-full px-3 py-2 text-left rounded-xl text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium transition-colors disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Move Up</span>
                </button>

                <button
                  onClick={() => {
                    const target = groupContextMenu;
                    setGroupContextMenu(null);
                    moveGroup(target.groupId, 'down');
                  }}
                  disabled={
                    categoryGroups.findIndex((g) => g.id === groupContextMenu.groupId) === categoryGroups.length - 1
                  }
                  className="w-full px-3 py-2 text-left rounded-xl text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium transition-colors disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Move Down</span>
                </button>
              </>
            )}

            {isOwner && (
              <button
                onClick={() => {
                  const target = groupContextMenu;
                  setGroupContextMenu(null);
                  confirmDelete({
                    title: `Delete group "${target.name}"?`,
                    message: `Folders in this group will not be deleted; they will be moved to Ungrouped.`,
                    confirmText: 'Delete Group',
                    onConfirm: () => onDeleteCategoryGroup?.(target.groupId),
                  });
                }}
                className="w-full px-3 py-2 text-left rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Group</span>
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
    </>
  );
});
