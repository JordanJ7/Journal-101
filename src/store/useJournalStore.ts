import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  AccentTheme,
  AppState,
  BulletPoint,
  CommentItem,
  CoreCategoryConfig,
  CoreCategoryId,
  CoreSubCategoryConfig,
  CoreTopicItem,
  FilterOptions,
  ItemActivityStatus,
  ViewMode,
  WeeklyBlock,
} from '../types';
import { CORE_CATEGORIES_CONFIG, INITIAL_COMMENTS, INITIAL_CORE_ITEMS, INITIAL_WEEKS } from '../data/initialData';
import { formatTimestamp, loadAppState, saveAppState, parseDateFromTimestamp, getWeekTitleAndRangeForDate } from '../utils/storage';
import { relocateBulletToMatchingWeek, sortBulletsByDate, sortWeeksChronologically, isDateWithinWeek, getEntryDate } from '../utils/dateUtils';
import {
  CurrentUserProfile,
  DEFAULT_PERMISSIONS,
  PermissionsDoc,
  saveJournalDataToCloud,
  subscribeJournalData,
  subscribePermissions,
  onAuthStateChangedWrapper,
  logoutUser,
  UserRole,
  CLIENT_SESSION_ID,
} from '../lib/firebase';

const INITIAL_OWNER_PROFILE: CurrentUserProfile = {
  uid: 'owner-session',
  email: DEFAULT_PERMISSIONS.ownerEmail,
  displayName: 'Journal Owner',
  isLoggedIn: false,
  role: 'owner',
  isSimulated: false,
};

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface JournalStoreState {
  // Data state (clean empty defaults)
  weeks: WeeklyBlock[];
  activeWeekId: string;
  coreItems: CoreTopicItem[];
  activeCoreCategory: CoreCategoryId;
  activeCoreSubCategory?: string;
  coreCategories: CoreCategoryConfig[];
  pinnedCategoryIds: string[];
  theme: 'light' | 'dark';
  accentTheme: AccentTheme;
  filters: FilterOptions;
  comments: CommentItem[];
  viewMode: ViewMode;

  // Auto-Save status & telemetry
  saveStatus: AutoSaveStatus;
  lastSavedAt: string | null;

  // Modals & UI navigation state
  isExportModalOpen: boolean;
  isAccessManagementOpen: boolean;
  isCommentsSidebarOpen: boolean;
  activeCommentSectionTag?: string;
  isOpenMobile: boolean;
  isSidebarOpen: boolean;
  isFullScreen: boolean;
  isEditorOpen: boolean;

  // Auth & Permissions state
  permissions: PermissionsDoc;
  currentUser: CurrentUserProfile;

  // Action methods
  setWeeks: (weeksOrUpdater: WeeklyBlock[] | ((prev: WeeklyBlock[]) => WeeklyBlock[])) => void;
  addWeek: (newWeek: WeeklyBlock) => void;
  updateWeek: (updatedWeek: WeeklyBlock) => void;
  deleteWeek: (weekId: string) => void;
  reorderWeeks: (weeks: WeeklyBlock[]) => void;
  updateBulletTimestamp: (
    weekId: string,
    bulletId: string,
    newTimestamp: string,
    newIsoDate?: string,
    isCustom?: boolean
  ) => void;
  updateEntryTimestamp: (entryId: string, isoTimestamp: string) => Promise<void>;
  updateWeeklyEntryTimestamp: (weekId: string, newTimestamp: string, newIsoDate?: string) => Promise<void>;
  setActiveWeekId: (id: string) => void;

  setCoreItems: (itemsOrUpdater: CoreTopicItem[] | ((prev: CoreTopicItem[]) => CoreTopicItem[])) => void;
  addCoreItem: (item: CoreTopicItem) => void;
  updateCoreItem: (item: CoreTopicItem) => void;
  deleteCoreItem: (id: string) => void;
  toggleCompleteCoreItem: (item: CoreTopicItem) => void;
  updateCoreItemStatus: (item: CoreTopicItem, status: ItemActivityStatus) => void;
  setActiveCoreCategory: (catId: CoreCategoryId) => void;
  setActiveCoreSubCategory: (subCatId?: string) => void;

  setCoreCategories: (catsOrUpdater: CoreCategoryConfig[] | ((prev: CoreCategoryConfig[]) => CoreCategoryConfig[])) => void;
  addCoreCategory: (newCat: CoreCategoryConfig) => void;
  updateCoreCategory: (catId: string, updated: Partial<CoreCategoryConfig>) => void;
  deleteCoreCategory: (catId: string) => void;
  reorderCoreCategories: (cats: CoreCategoryConfig[]) => void;
  addSubCategory: (categoryId: string, subCategory: CoreSubCategoryConfig) => void;
  updateSubCategory: (categoryId: string, subCategoryId: string, updated: Partial<CoreSubCategoryConfig>) => void;
  deleteSubCategory: (categoryId: string, subCategoryId: string) => void;
  reorderSubCategories: (categoryId: string, subCategories: CoreSubCategoryConfig[]) => void;
  moveCoreItemToSubCategory: (itemId: string, targetCategoryId: string, targetSubCategoryId?: string) => void;

  setPinnedCategoryIds: (ids: string[]) => void;
  togglePinCategory: (categoryId: string) => void;
  reorderPinnedCategories: (ids: string[]) => void;

  setTheme: (theme: 'light' | 'dark') => void;
  setAccentTheme: (accent: AccentTheme) => void;
  setFilters: (filtersOrUpdater: FilterOptions | ((prev: FilterOptions) => FilterOptions)) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;

  setComments: (commentsOrUpdater: CommentItem[] | ((prev: CommentItem[]) => CommentItem[])) => void;
  addComment: (comment: Omit<CommentItem, 'id' | 'timestamp'>) => void;
  resolveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  editComment: (id: string, newContent: string) => void;

  togglePinTakeaway: (bullet: BulletPoint, week: WeeklyBlock) => void;

  flushAutoSave: () => Promise<void>;

  setIsExportModalOpen: (isOpen: boolean) => void;
  setIsAccessManagementOpen: (isOpen: boolean) => void;
  setIsCommentsSidebarOpen: (isOpen: boolean) => void;
  setActiveCommentSectionTag: (tag?: string) => void;
  setIsOpenMobile: (isOpen: boolean) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setIsFullScreen: (isFull: boolean) => void;
  toggleFullScreen: () => void;
  setIsEditorOpen: (isOpen: boolean) => void;
  toggleEditor: () => void;

  setCurrentUser: (userOrUpdater: CurrentUserProfile | ((prev: CurrentUserProfile) => CurrentUserProfile)) => void;
  setPermissions: (perms: PermissionsDoc) => void;
  switchSimulatedUser: (email: string, role: UserRole) => void;
  logout: () => Promise<void>;

  syncFromCloud: (cloudData: Partial<AppState>) => void;
  resetAllData: () => void;
}

// Generous Debounced background persistence helper (triggers Firestore & Storage update 1400ms after user stops typing)
const AUTO_SAVE_DEBOUNCE_MS = 1400;
let syncTimeout: any = null;
let lastLocalMutationTime = 0;
let lastUserKeystrokeTime = 0;
let isSyncInProgress = false;
let pendingSaveAfterSync = false;

const executeSave = async (get: () => JournalStoreState) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  // Guard: If user is actively typing / mid-sentence (typed within the last AUTO_SAVE_DEBOUNCE_MS),
  // reschedule to give the user uninterrupted smooth input flow.
  const timeSinceLastKeystroke = Date.now() - lastUserKeystrokeTime;
  if (timeSinceLastKeystroke < AUTO_SAVE_DEBOUNCE_MS && lastUserKeystrokeTime > 0) {
    const remainingDelay = Math.max(350, AUTO_SAVE_DEBOUNCE_MS - timeSinceLastKeystroke);
    syncTimeout = setTimeout(() => {
      executeSave(get);
    }, remainingDelay);
    return;
  }

  // Guard against concurrent overlapping network dispatches
  if (isSyncInProgress) {
    pendingSaveAfterSync = true;
    return;
  }

  isSyncInProgress = true;
  useJournalStore.setState({ saveStatus: 'saving' });
  const s = get();

  try {
    const appState: AppState = {
      weeks: s.weeks,
      activeWeekId: s.activeWeekId,
      coreItems: s.coreItems,
      activeCoreCategory: s.activeCoreCategory,
      activeCoreSubCategory: s.activeCoreSubCategory,
      theme: s.theme,
      accentTheme: s.accentTheme,
      coreCategories: s.coreCategories,
      pinnedCategoryIds: s.pinnedCategoryIds,
      filters: s.filters,
      comments: s.comments,
    };
    saveAppState(appState);
    if (s.currentUser?.role && s.currentUser.role !== 'viewer') {
      await saveJournalDataToCloud(appState);
    }
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    useJournalStore.setState({
      saveStatus: 'saved',
      lastSavedAt: formattedTime,
    });
  } catch (err) {
    console.warn('Auto-save sync status:', err);
    // Even if cloud write fails, local storage is safely preserved
    useJournalStore.setState({ saveStatus: 'saved', lastSavedAt: 'Saved locally' });
  } finally {
    isSyncInProgress = false;
    if (pendingSaveAfterSync) {
      pendingSaveAfterSync = false;
      schedulePersistence(get, 400);
    }
  }
};

const schedulePersistence = (get: () => JournalStoreState, delayMs = AUTO_SAVE_DEBOUNCE_MS) => {
  lastLocalMutationTime = Date.now();
  lastUserKeystrokeTime = Date.now();
  // Mark as unsaved immediately upon typing / mutation for instant responsive feedback
  useJournalStore.setState({ saveStatus: 'unsaved' });

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    executeSave(get);
  }, delayMs);
};

// Global window lifecycle listeners to flush pending debounced saves immediately
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useJournalStore.getState().flushAutoSave();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      useJournalStore.getState().flushAutoSave();
    }
  });
}

const initialLoaded = loadAppState();

export const useJournalStore = create<JournalStoreState>((set, get) => ({
  weeks: Array.isArray(initialLoaded.weeks) ? initialLoaded.weeks : INITIAL_WEEKS,
  activeWeekId: initialLoaded.activeWeekId || initialLoaded.weeks?.[0]?.id || '',
  coreItems: Array.isArray(initialLoaded.coreItems) ? initialLoaded.coreItems : INITIAL_CORE_ITEMS,
  activeCoreCategory: initialLoaded.activeCoreCategory || initialLoaded.coreCategories?.[0]?.id || 'what-to-text-her',
  activeCoreSubCategory: initialLoaded.activeCoreSubCategory,
  coreCategories: initialLoaded.coreCategories && initialLoaded.coreCategories.length > 0
    ? initialLoaded.coreCategories
    : CORE_CATEGORIES_CONFIG,
  pinnedCategoryIds: Array.isArray(initialLoaded.pinnedCategoryIds) && initialLoaded.pinnedCategoryIds.length > 0
    ? initialLoaded.pinnedCategoryIds
    : ['foods-to-try', 'my-hobbies', 'backstory-stuff', 'things-i-want-to-do'],
  theme: initialLoaded.theme || 'light',
  accentTheme: initialLoaded.accentTheme || 'blue',
  filters: initialLoaded.filters || {
    searchQuery: '',
    hasMediaOnly: false,
    hasTherapistAnswersOnly: false,
    dateRange: 'all',
  },
  comments: Array.isArray(initialLoaded.comments) ? initialLoaded.comments : INITIAL_COMMENTS,
  viewMode: 'weekly',

  saveStatus: 'saved',
  lastSavedAt: null,

  flushAutoSave: async () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    await executeSave(get);
  },

  isExportModalOpen: false,
  isAccessManagementOpen: false,
  isCommentsSidebarOpen: false,
  activeCommentSectionTag: undefined,
  isOpenMobile: false,
  isSidebarOpen: true,
  isFullScreen: false,
  isEditorOpen: true,

  permissions: DEFAULT_PERMISSIONS,
  currentUser: INITIAL_OWNER_PROFILE,

  // Optimistic Week Operations
  setWeeks: (weeksOrUpdater) => {
    set((state) => {
      const nextWeeks = typeof weeksOrUpdater === 'function' ? weeksOrUpdater(state.weeks) : weeksOrUpdater;
      return { weeks: nextWeeks };
    });
    schedulePersistence(get);
  },

  addWeek: (newWeek) => {
    set((state) => ({
      weeks: [newWeek, ...state.weeks],
      activeWeekId: newWeek.id,
      viewMode: 'weekly',
    }));
    schedulePersistence(get);
  },

  updateWeek: (updatedWeek) => {
    set((state) => ({
      weeks: state.weeks.map((w) => (w.id === updatedWeek.id ? updatedWeek : w)),
    }));
    schedulePersistence(get);
  },

  deleteWeek: (weekId) => {
    set((state) => {
      const updated = state.weeks.filter((w) => w.id !== weekId);
      const nextActiveId = state.activeWeekId === weekId ? (updated[0]?.id || '') : state.activeWeekId;
      return {
        weeks: updated,
        activeWeekId: nextActiveId,
      };
    });
    schedulePersistence(get);
  },

  reorderWeeks: (weeks) => {
    set({ weeks });
    schedulePersistence(get);
  },

  updateBulletTimestamp: (weekId, bulletId, newTimestamp, newIsoDate, isCustom = true) => {
    set((state) => {
      const sourceWeek = state.weeks.find((w) => w.id === weekId);
      if (!sourceWeek) return {};

      const targetBullet = sourceWeek.bullets.find((b) => b.id === bulletId);
      if (!targetBullet) return {};

      const updatedBullet: BulletPoint = {
        ...targetBullet,
        timestamp: newTimestamp,
        isoDate: newIsoDate,
        isCustomDate: isCustom,
        isEdited: true,
      };

      const dateObj = getEntryDate(newTimestamp);

      // If the date is still within this week, sort chronologically in-place
      if (isDateWithinWeek(dateObj, sourceWeek)) {
        const otherBullets = sourceWeek.bullets.filter((b) => b.id !== bulletId);
        const sortedBullets = sortBulletsByDate([...otherBullets, updatedBullet], 'asc');
        const nextWeeks = state.weeks.map((w) =>
          w.id === weekId
            ? { ...w, updatedAt: new Date().toISOString(), bullets: sortedBullets }
            : w
        );
        return { weeks: nextWeeks };
      }

      // If the date falls outside the current week, relocate to matching/new historical week
      const { updatedWeeks, targetWeekId } = relocateBulletToMatchingWeek(
        updatedBullet,
        weekId,
        state.weeks
      );

      return {
        weeks: updatedWeeks,
        activeWeekId: targetWeekId || state.activeWeekId,
      };
    });

    schedulePersistence(get);
  },

  updateEntryTimestamp: async (entryId: string, isoTimestamp: string) => {
    const dateObj = new Date(isoTimestamp);
    if (isNaN(dateObj.getTime())) return;
    const formattedTimestamp = formatTimestamp(dateObj);

    set((state) => {
      // Search for the bullet in weeks
      let targetWeekId = '';
      let targetBullet: BulletPoint | null = null;

      for (const w of state.weeks) {
        const found = w.bullets.find((b) => b.id === entryId);
        if (found) {
          targetWeekId = w.id;
          targetBullet = found;
          break;
        }
      }

      if (!targetBullet || !targetWeekId) {
        // Also check if it is a coreTopicItem
        const coreMatch = state.coreItems.find((i) => i.id === entryId);
        if (coreMatch) {
          return {
            coreItems: state.coreItems.map((i) =>
              i.id === entryId
                ? {
                    ...i,
                    createdAt: isoTimestamp,
                    updatedAt: new Date().toISOString(),
                    timestamp: formattedTimestamp,
                  }
                : i
            ),
          };
        }
        return {};
      }

      const updatedBullet: BulletPoint = {
        ...targetBullet,
        createdAt: isoTimestamp,
        updatedAt: new Date().toISOString(),
        timestamp: formattedTimestamp,
        isoDate: isoTimestamp,
        isCustomDate: true,
        isEdited: true,
      };

      const sourceWeek = state.weeks.find((w) => w.id === targetWeekId)!;

      if (isDateWithinWeek(dateObj, sourceWeek)) {
        const otherBullets = sourceWeek.bullets.filter((b) => b.id !== entryId);
        const sortedBullets = sortBulletsByDate([...otherBullets, updatedBullet], 'asc');
        const nextWeeks = state.weeks.map((w) =>
          w.id === targetWeekId
            ? { ...w, updatedAt: new Date().toISOString(), bullets: sortedBullets }
            : w
        );
        return { weeks: nextWeeks };
      }

      const { updatedWeeks, targetWeekId: newWeekId } = relocateBulletToMatchingWeek(
        updatedBullet,
        targetWeekId,
        state.weeks
      );

      return {
        weeks: updatedWeeks,
        activeWeekId: newWeekId || state.activeWeekId,
      };
    });

    // Immediately commit the full sanitized entry list to Firestore
    try {
      const currentState = get();
      await saveJournalDataToCloud(currentState);
      useJournalStore.setState({ saveStatus: 'saved', lastSavedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[Firestore Error] Failed to update timestamp:', err);
    }
  },

  updateWeeklyEntryTimestamp: async (weekId: string, newTimestamp: string, newIsoDate?: string) => {
    const dateObj = parseDateFromTimestamp(newIsoDate || newTimestamp);
    if (isNaN(dateObj.getTime())) return;
    const isoString = dateObj.toISOString();
    const formattedTimestamp = formatTimestamp(dateObj);
    const { weekTitle: newWeekTitle, startDate: newStartDate, endDate: newEndDate } = getWeekTitleAndRangeForDate(dateObj);

    set((state) => {
      const targetWeek = state.weeks.find((w) => w.id === weekId);
      if (!targetWeek) return {};

      const updatedWeek: WeeklyBlock = {
        ...targetWeek,
        createdAt: isoString,
        updatedAt: new Date().toISOString(),
        timestamp: formattedTimestamp,
        isCustomDate: true,
        weekTitle: newWeekTitle,
        startDate: newStartDate,
        endDate: newEndDate,
      };

      const updatedWeeks = state.weeks.map((w) => (w.id === weekId ? updatedWeek : w));
      const sortedWeeks = sortWeeksChronologically(updatedWeeks, 'desc');

      return {
        weeks: sortedWeeks,
        activeWeekId: weekId,
      };
    });

    // Commit to Firestore & local storage
    try {
      const currentState = get();
      await saveJournalDataToCloud(currentState);
      useJournalStore.setState({ saveStatus: 'saved', lastSavedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[Firestore Error] Failed to update weekly entry timestamp:', err);
    }
  },

  setActiveWeekId: (id) => {
    // Explicit trigger: flush any pending debounced write before navigating
    if (get().saveStatus === 'unsaved') {
      get().flushAutoSave();
    }
    set({ activeWeekId: id });
  },

  // Optimistic Core Item Operations
  setCoreItems: (itemsOrUpdater) => {
    set((state) => {
      const nextItems = typeof itemsOrUpdater === 'function' ? itemsOrUpdater(state.coreItems) : itemsOrUpdater;
      return { coreItems: nextItems };
    });
    schedulePersistence(get);
  },

  addCoreItem: (item) => {
    set((state) => ({
      coreItems: [item, ...state.coreItems],
    }));
    schedulePersistence(get);
  },

  updateCoreItem: (item) => {
    set((state) => {
      const exists = state.coreItems.some((i) => i.id === item.id);
      return {
        coreItems: exists
          ? state.coreItems.map((i) => (i.id === item.id ? item : i))
          : [item, ...state.coreItems],
      };
    });
    schedulePersistence(get);
  },

  deleteCoreItem: (id) => {
    set((state) => ({
      coreItems: state.coreItems.filter((i) => i.id !== id),
    }));
    schedulePersistence(get);
  },

  toggleCompleteCoreItem: (item) => {
    const nextStatus: ItemActivityStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    set((state) => ({
      coreItems: state.coreItems.map((i) =>
        i.id === item.id ? { ...i, status: nextStatus } : i
      ),
    }));
    schedulePersistence(get);
  },

  updateCoreItemStatus: (item, status) => {
    set((state) => ({
      coreItems: state.coreItems.map((i) =>
        i.id === item.id ? { ...i, status } : i
      ),
    }));
    schedulePersistence(get);
  },

  setActiveCoreCategory: (catId) => {
    // Explicit trigger: flush any pending debounced write before opening another folder
    if (get().saveStatus === 'unsaved') {
      get().flushAutoSave();
    }
    set({ activeCoreCategory: catId, activeCoreSubCategory: undefined });
  },

  setActiveCoreSubCategory: (subCatId) => {
    if (get().saveStatus === 'unsaved') {
      get().flushAutoSave();
    }
    set({ activeCoreSubCategory: subCatId });
  },

  // Core Category Operations
  setCoreCategories: (catsOrUpdater) => {
    set((state) => {
      const nextCats = typeof catsOrUpdater === 'function' ? catsOrUpdater(state.coreCategories) : catsOrUpdater;
      return { coreCategories: nextCats };
    });
    schedulePersistence(get);
  },

  addCoreCategory: (newCat) => {
    set((state) => ({
      coreCategories: [...state.coreCategories, newCat],
      activeCoreCategory: newCat.id,
      viewMode: 'core',
    }));
    schedulePersistence(get);
  },

  updateCoreCategory: (catId, updated) => {
    set((state) => ({
      coreCategories: state.coreCategories.map((c) =>
        c.id === catId ? { ...c, ...updated } : c
      ),
    }));
    schedulePersistence(get);
  },

  deleteCoreCategory: (catId) => {
    set((state) => {
      const updatedCats = state.coreCategories.filter((c) => c.id !== catId);
      const updatedItems = state.coreItems.filter((i) => i.categoryId !== catId);
      let nextActiveCat = state.activeCoreCategory;
      if (state.activeCoreCategory === catId) {
        nextActiveCat = updatedCats[0]?.id || 'what-to-text-her';
      }
      return {
        coreCategories: updatedCats,
        coreItems: updatedItems,
        activeCoreCategory: nextActiveCat,
      };
    });
    schedulePersistence(get);
  },

  reorderCoreCategories: (cats) => {
    set({ coreCategories: cats });
    schedulePersistence(get);
  },

  setPinnedCategoryIds: (ids) => {
    set({ pinnedCategoryIds: ids });
    schedulePersistence(get);
  },

  togglePinCategory: (categoryId) => {
    set((state) => {
      const isPinned = state.pinnedCategoryIds.includes(categoryId);
      const updated = isPinned
        ? state.pinnedCategoryIds.filter((id) => id !== categoryId)
        : [...state.pinnedCategoryIds, categoryId];
      return { pinnedCategoryIds: updated };
    });
    schedulePersistence(get);
  },

  reorderPinnedCategories: (ids) => {
    set({ pinnedCategoryIds: ids });
    schedulePersistence(get);
  },

  addSubCategory: (categoryId, subCategory) => {
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId) {
          const currentSubs = c.subCategories || [];
          // Avoid duplicate IDs
          const exists = currentSubs.some((s) => s.id === subCategory.id);
          const nextSubs = exists
            ? currentSubs.map((s) => (s.id === subCategory.id ? subCategory : s))
            : [...currentSubs, subCategory];
          return {
            ...c,
            subCategories: nextSubs,
          };
        }
        return c;
      });
      return { coreCategories: updatedCats };
    });
    schedulePersistence(get);
  },

  updateSubCategory: (categoryId, subCategoryId, updated) => {
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId && c.subCategories) {
          return {
            ...c,
            subCategories: c.subCategories.map((s) => (s.id === subCategoryId ? { ...s, ...updated } : s)),
          };
        }
        return c;
      });
      return { coreCategories: updatedCats };
    });
    schedulePersistence(get);
  },

  deleteSubCategory: (categoryId, subCategoryId) => {
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId && c.subCategories) {
          return {
            ...c,
            subCategories: c.subCategories.filter((s) => s.id !== subCategoryId),
          };
        }
        return c;
      });
      // Clear subCategoryId from items in this subcategory (moves them to parent category root)
      const updatedItems = state.coreItems.map((item) => {
        if (item.categoryId === categoryId && item.subCategoryId === subCategoryId) {
          return { ...item, subCategoryId: undefined };
        }
        return item;
      });
      return {
        coreCategories: updatedCats,
        coreItems: updatedItems,
      };
    });
    schedulePersistence(get);
  },

  reorderSubCategories: (categoryId, subCategories) => {
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId) {
          return { ...c, subCategories };
        }
        return c;
      });
      return { coreCategories: updatedCats };
    });
    schedulePersistence(get);
  },

  moveCoreItemToSubCategory: (itemId, targetCategoryId, targetSubCategoryId) => {
    set((state) => ({
      coreItems: state.coreItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            categoryId: targetCategoryId,
            subCategoryId: targetSubCategoryId || undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      }),
    }));
    schedulePersistence(get);
  },

  // Theme & Filter Settings
  setTheme: (theme) => {
    set({ theme });
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    schedulePersistence(get);
  },

  setAccentTheme: (accentTheme) => {
    set({ accentTheme });
    schedulePersistence(get);
  },

  setFilters: (filtersOrUpdater) => {
    set((state) => {
      const nextFilters = typeof filtersOrUpdater === 'function' ? filtersOrUpdater(state.filters) : filtersOrUpdater;
      return { filters: nextFilters };
    });
    schedulePersistence(get);
  },

  setSearchQuery: (query) => {
    set((state) => ({
      filters: { ...state.filters, searchQuery: query },
    }));
    schedulePersistence(get);
  },

  setViewMode: (viewMode) => {
    // Explicit trigger: flush any pending debounced write before switching tabs
    if (get().saveStatus === 'unsaved') {
      get().flushAutoSave();
    }
    set({ viewMode });
  },

  // Comment Operations
  setComments: (commentsOrUpdater) => {
    set((state) => {
      const nextComments = typeof commentsOrUpdater === 'function' ? commentsOrUpdater(state.comments) : commentsOrUpdater;
      return { comments: nextComments };
    });
    schedulePersistence(get);
  },

  addComment: (commentData) => {
    const newComment: CommentItem = {
      ...commentData,
      id: 'comm-' + Date.now(),
      timestamp: formatTimestamp(),
    };
    set((state) => ({
      comments: [newComment, ...state.comments],
    }));
    schedulePersistence(get);
  },

  resolveComment: (id) => {
    set((state) => ({
      comments: state.comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)),
    }));
    schedulePersistence(get);
  },

  deleteComment: (id) => {
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
    }));
    schedulePersistence(get);
  },

  editComment: (id, newContent) => {
    set((state) => ({
      comments: state.comments.map((c) => (c.id === id ? { ...c, content: newContent } : c)),
    }));
    schedulePersistence(get);
  },

  // Takeaway Pinning
  togglePinTakeaway: (bullet, week) => {
    set((state) => {
      const isCurrentlyPinned = Boolean(bullet.pinnedToLearned);
      const newPinnedState = !isCurrentlyPinned;

      const updatedWeeks = state.weeks.map((w) => {
        if (w.id !== week.id) return w;
        return {
          ...w,
          bullets: w.bullets.map((b) =>
            b.id === bullet.id ? { ...b, pinnedToLearned: newPinnedState } : b
          ),
        };
      });

      let updatedCoreItems = [...state.coreItems];
      if (newPinnedState) {
        const existingIndex = updatedCoreItems.findIndex(
          (item) => item.pinnedBulletId === bullet.id
        );
        const newItem: CoreTopicItem = {
          id: existingIndex >= 0 ? updatedCoreItems[existingIndex].id : 'pinned-' + bullet.id,
          categoryId: 'things-i-learned-about-myself',
          title: `Takeaway from ${week.weekTitle}`,
          content: bullet.text,
          timestamp: formatTimestamp(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinnedFromWeekId: week.id,
          pinnedFromWeekTitle: week.weekTitle,
          pinnedBulletId: bullet.id,
          mediaUrl: bullet.mediaUrl,
          mediaCaption: bullet.mediaCaption,
        };
        if (existingIndex >= 0) {
          updatedCoreItems[existingIndex] = newItem;
        } else {
          updatedCoreItems = [newItem, ...updatedCoreItems];
        }
      } else {
        updatedCoreItems = updatedCoreItems.filter(
          (item) => item.pinnedBulletId !== bullet.id
        );
      }

      return {
        weeks: updatedWeeks,
        coreItems: updatedCoreItems,
      };
    });
    schedulePersistence(get);
  },

  // Modal actions
  setIsExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  setIsAccessManagementOpen: (isAccessManagementOpen) => set({ isAccessManagementOpen }),
  setIsCommentsSidebarOpen: (isCommentsSidebarOpen) => set({ isCommentsSidebarOpen }),
  setActiveCommentSectionTag: (activeCommentSectionTag) => set({ activeCommentSectionTag }),
  setIsOpenMobile: (isOpenMobile) => set({ isOpenMobile }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
  setIsEditorOpen: (isEditorOpen) => set({ isEditorOpen }),
  toggleEditor: () => set((state) => ({ isEditorOpen: !state.isEditorOpen })),

  // Auth / Permissions
  setCurrentUser: (userOrUpdater) => {
    set((state) => ({
      currentUser: typeof userOrUpdater === 'function' ? userOrUpdater(state.currentUser) : userOrUpdater,
    }));
  },

  setPermissions: (permissions) => set({ permissions }),

  switchSimulatedUser: (email, role) => {
    set({
      currentUser: {
        uid: `sim-${role}-${Date.now()}`,
        email,
        displayName: email.split('@')[0],
        isLoggedIn: false,
        role,
        isSimulated: true,
      },
    });
  },

  logout: async () => {
    await logoutUser();
    set({
      currentUser: {
        uid: '',
        email: '',
        displayName: '',
        isLoggedIn: false,
        role: 'viewer',
      },
    });
  },

  syncFromCloud: (cloudData: Partial<AppState> & { clientSessionId?: string; updatedAt?: string }) => {
    // If the snapshot came from our own active session, we are already ahead or in sync
    if (cloudData.clientSessionId && cloudData.clientSessionId === CLIENT_SESSION_ID) {
      return;
    }

    const state = get();
    const isUserActivelyTyping =
      state.saveStatus === 'unsaved' ||
      Date.now() - lastUserKeystrokeTime < 2500 ||
      Date.now() - lastLocalMutationTime < 2500;

    // Check if new data is actually different from local state to prevent unnecessary re-renders
    const incomingWeeks = cloudData.weeks && Array.isArray(cloudData.weeks) ? cloudData.weeks : state.weeks;
    const incomingCoreItems = cloudData.coreItems && Array.isArray(cloudData.coreItems) ? cloudData.coreItems : state.coreItems;
    const incomingCoreCategories = cloudData.coreCategories && Array.isArray(cloudData.coreCategories) ? cloudData.coreCategories : state.coreCategories;
    const incomingPinnedCategoryIds = cloudData.pinnedCategoryIds && Array.isArray(cloudData.pinnedCategoryIds) ? cloudData.pinnedCategoryIds : state.pinnedCategoryIds;
    const incomingComments = cloudData.comments && Array.isArray(cloudData.comments) ? cloudData.comments : state.comments;

    // Quick structural equality check
    const isWeeksEqual = incomingWeeks.length === state.weeks.length && JSON.stringify(incomingWeeks) === JSON.stringify(state.weeks);
    const isCoreItemsEqual = incomingCoreItems.length === state.coreItems.length && JSON.stringify(incomingCoreItems) === JSON.stringify(state.coreItems);
    const isCategoriesEqual = incomingCoreCategories.length === state.coreCategories.length && JSON.stringify(incomingCoreCategories) === JSON.stringify(state.coreCategories);
    const isPinnedEqual = incomingPinnedCategoryIds.length === state.pinnedCategoryIds.length && JSON.stringify(incomingPinnedCategoryIds) === JSON.stringify(state.pinnedCategoryIds);
    const isCommentsEqual = (incomingComments?.length || 0) === (state.comments?.length || 0) && JSON.stringify(incomingComments) === JSON.stringify(state.comments);

    if (isWeeksEqual && isCoreItemsEqual && isCategoriesEqual && isPinnedEqual && isCommentsEqual) {
      return;
    }

    set((currentState) => {
      let nextWeeks = incomingWeeks;
      let nextCoreCategories = incomingCoreCategories;

      // If user is currently typing in the active week or active category, merge non-conflicting sections
      if (isUserActivelyTyping) {
        // Retain the actively edited week draft
        nextWeeks = incomingWeeks.map((remoteWeek) => {
          if (remoteWeek.id === currentState.activeWeekId) {
            const currentActiveWeek = currentState.weeks.find((w) => w.id === currentState.activeWeekId);
            return currentActiveWeek || remoteWeek;
          }
          return remoteWeek;
        });

        // Retain the actively edited category notes draft
        nextCoreCategories = incomingCoreCategories.map((remoteCat) => {
          if (remoteCat.id === currentState.activeCoreCategory) {
            const currentActiveCat = currentState.coreCategories.find((c) => c.id === currentState.activeCoreCategory);
            return currentActiveCat || remoteCat;
          }
          return remoteCat;
        });
      }

      const hasActiveWeek = nextWeeks.some((w) => w.id === currentState.activeWeekId);
      const activeWeekId = hasActiveWeek ? currentState.activeWeekId : nextWeeks[0]?.id || '';

      const hasActiveCat = nextCoreCategories.some((c) => c.id === currentState.activeCoreCategory);
      const activeCoreCategory = hasActiveCat ? currentState.activeCoreCategory : nextCoreCategories[0]?.id || currentState.activeCoreCategory;

      return {
        weeks: nextWeeks,
        coreItems: incomingCoreItems,
        coreCategories: nextCoreCategories,
        pinnedCategoryIds: incomingPinnedCategoryIds,
        comments: incomingComments,
        activeWeekId,
        activeCoreCategory,
      };
    });

    // Mirror to localStorage so browser reloads maintain latest remote state
    try {
      const s = get();
      saveAppState({
        weeks: s.weeks,
        activeWeekId: s.activeWeekId,
        coreItems: s.coreItems,
        activeCoreCategory: s.activeCoreCategory,
        activeCoreSubCategory: s.activeCoreSubCategory,
        theme: s.theme,
        accentTheme: s.accentTheme,
        coreCategories: s.coreCategories,
        pinnedCategoryIds: s.pinnedCategoryIds,
        filters: s.filters,
        comments: s.comments,
      });
    } catch (err) {
      console.warn('Sync cache update note:', err);
    }
  },

  resetAllData: () => {
    set({
      weeks: [],
      activeWeekId: '',
      coreItems: [],
      comments: [],
      filters: {
        searchQuery: '',
        hasMediaOnly: false,
        hasTherapistAnswersOnly: false,
        dateRange: 'all',
      },
    });
    schedulePersistence(get);
  },
}));

// Atomic Selector Hooks for maximal rendering performance & zero cascading re-renders
export const useWeeks = () => useJournalStore((s) => s.weeks);
export const useActiveWeekId = () => useJournalStore((s) => s.activeWeekId);
export const useActiveWeek = () =>
  useJournalStore(
    useShallow((s) => s.weeks.find((w) => w.id === s.activeWeekId) || s.weeks[0])
  );
export const useCoreItems = () => useJournalStore((s) => s.coreItems);
export const useActiveCoreCategory = () => useJournalStore((s) => s.activeCoreCategory);
export const useCoreCategories = () => useJournalStore((s) => s.coreCategories);
export const usePinnedCategoryIds = () => useJournalStore((s) => s.pinnedCategoryIds);
export const useFilters = () => useJournalStore((s) => s.filters);
export const useTheme = () => useJournalStore((s) => s.theme);
export const useAccentTheme = () => useJournalStore((s) => s.accentTheme);
export const useComments = () => useJournalStore((s) => s.comments);
export const useViewMode = () => useJournalStore((s) => s.viewMode);
export const useCurrentUser = () => useJournalStore((s) => s.currentUser);
export const usePermissions = () => useJournalStore((s) => s.permissions);
export const useSaveStatus = () => useJournalStore((s) => s.saveStatus);
export const useLastSavedAt = () => useJournalStore((s) => s.lastSavedAt);
export const useIsSidebarOpen = () => useJournalStore((s) => s.isSidebarOpen);
export const useIsOpenMobile = () => useJournalStore((s) => s.isOpenMobile);
export const useIsFullScreen = () => useJournalStore((s) => s.isFullScreen);
export const useIsEditorOpen = () => useJournalStore((s) => s.isEditorOpen);
export const useIsExportModalOpen = () => useJournalStore((s) => s.isExportModalOpen);
export const useIsAccessManagementOpen = () => useJournalStore((s) => s.isAccessManagementOpen);
export const useIsCommentsSidebarOpen = () => useJournalStore((s) => s.isCommentsSidebarOpen);
export const useActiveCommentSectionTag = () => useJournalStore((s) => s.activeCommentSectionTag);
export const useUpdateWeeklyEntryTimestamp = () => useJournalStore((s) => s.updateWeeklyEntryTimestamp);
