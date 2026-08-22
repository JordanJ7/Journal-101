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
  saveFolderDoc,
  deleteFolderDoc,
  saveCoreTopicDoc,
  deleteCoreTopicDoc,
  saveEntryDoc,
  updateEntryDoc,
  deleteEntryDoc,
  saveWeekMetaDoc,
  deleteWeekDoc,
  saveCommentDoc,
  deleteCommentDoc,
  saveCoreCategoriesDoc,
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
  // Hydration state (prevents unhydrated state from overwriting Firestore)
  isHydrated: boolean;
  setIsHydrated: (isHydrated: boolean) => void;

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

  // Direct Atomic Action methods
  createFolder: (folderData: CoreCategoryConfig) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  saveEntry: (weekId: string, entryData: BulletPoint) => Promise<void>;
  deleteEntry: (weekId: string, entryId: string) => Promise<void>;

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

  flushAutoSave: (entryId?: string) => Promise<void>;

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

// Debounced background persistence helper (600ms debounce)
const AUTO_SAVE_DEBOUNCE_MS = 600;
let syncTimeout: any = null;
let lastLocalMutationTime = 0;
let lastUserKeystrokeTime = 0;
let isSyncInProgress = false;
let pendingSaveAfterSync = false;
let pendingTargetEntryId: string | undefined = undefined;

const executeSave = async (get: () => JournalStoreState, entryId?: string) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  const s = get();

  // HYDRATION GUARD: Prevent saving empty/default state over Firestore before cloud hydration completes
  if (!s.isHydrated) {
    console.warn('[Auto-Save Guard] Save skipped: App state is still hydrating from Cloud Firestore.');
    return;
  }

  // Guard: If user typed within the debounce window, reschedule for smooth input flow
  const timeSinceLastKeystroke = Date.now() - lastUserKeystrokeTime;
  if (timeSinceLastKeystroke < AUTO_SAVE_DEBOUNCE_MS && lastUserKeystrokeTime > 0) {
    const remainingDelay = Math.max(250, AUTO_SAVE_DEBOUNCE_MS - timeSinceLastKeystroke);
    syncTimeout = setTimeout(() => {
      executeSave(get, entryId || pendingTargetEntryId);
    }, remainingDelay);
    return;
  }

  if (isSyncInProgress) {
    pendingSaveAfterSync = true;
    if (entryId) pendingTargetEntryId = entryId;
    return;
  }

  isSyncInProgress = true;
  useJournalStore.setState({ saveStatus: 'saving' });

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

    // 1. Immediate LocalStorage / IndexedDB Backup
    saveAppState(appState);

    // 2. Cloud Firestore Dispatch
    if (s.currentUser?.role && s.currentUser.role !== 'viewer') {
      await saveJournalDataToCloud(appState, entryId || pendingTargetEntryId);
    }

    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    useJournalStore.setState({
      saveStatus: 'saved',
      lastSavedAt: formattedTime,
    });
    console.log('[Auto-Save] Entry saved to Firestore:', entryId || pendingTargetEntryId || 'all');
    pendingTargetEntryId = undefined;
  } catch (err) {
    console.warn('[Auto-Save] Cloud write error, fallback to local backup:', err);
    useJournalStore.setState({ saveStatus: 'saved', lastSavedAt: 'Saved locally' });
  } finally {
    isSyncInProgress = false;
    if (pendingSaveAfterSync) {
      pendingSaveAfterSync = false;
      schedulePersistence(get, 200, pendingTargetEntryId);
    }
  }
};

const schedulePersistence = (get: () => JournalStoreState, delayMs = AUTO_SAVE_DEBOUNCE_MS, entryId?: string) => {
  lastLocalMutationTime = Date.now();
  lastUserKeystrokeTime = Date.now();
  if (entryId) pendingTargetEntryId = entryId;

  // Immediately mirror to LocalStorage failsafe backup upon every edit
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
    console.warn('Immediate local cache save note:', err);
  }

  useJournalStore.setState({ saveStatus: 'unsaved' });

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    executeSave(get, entryId);
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

if (typeof document !== 'undefined') {
  if (initialLoaded.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useJournalStore = create<JournalStoreState>((set, get) => ({
  isHydrated: false,
  setIsHydrated: (isHydrated) => set({ isHydrated }),

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
  theme: initialLoaded.theme || 'dark',
  accentTheme: initialLoaded.accentTheme || 'amber',
  filters: initialLoaded.filters || {
    searchQuery: '',
    hasMediaOnly: false,
    hasTherapistAnswersOnly: false,
    dateRange: 'all',
  },
  comments: Array.isArray(initialLoaded.comments) ? initialLoaded.comments : INITIAL_COMMENTS,
  viewMode: 'home',

  saveStatus: 'saved',
  lastSavedAt: null,

  flushAutoSave: async (entryId?: string) => {
    if (syncTimeout) clearTimeout(syncTimeout);
    await executeSave(get, entryId);
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

  // Direct Atomic Helper Handlers
  createFolder: async (folderData) => {
    set((state) => ({
      coreCategories: [...state.coreCategories.filter((c) => c.id !== folderData.id), folderData],
      activeCoreCategory: folderData.id,
    }));
    try {
      await saveFolderDoc(folderData);
      console.log('[Firestore SUCCESS] Folder saved:', folderData.id);
    } catch (err) {
      console.error('[Firestore CRITICAL ERROR] Failed to save folder:', err);
    }
    schedulePersistence(get);
  },

  deleteFolder: async (folderId) => {
    set((state) => {
      const updatedCats = state.coreCategories.filter((c) => c.id !== folderId);
      const updatedItems = state.coreItems.filter((i) => i.categoryId !== folderId);
      let nextActiveCat = state.activeCoreCategory;
      if (state.activeCoreCategory === folderId) {
        nextActiveCat = updatedCats[0]?.id || 'what-to-text-her';
      }
      return {
        coreCategories: updatedCats,
        coreItems: updatedItems,
        activeCoreCategory: nextActiveCat,
      };
    });
    try {
      await deleteFolderDoc(folderId);
      console.log('[Firestore SUCCESS] Folder deleted:', folderId);
    } catch (err) {
      console.error('[Firestore CRITICAL ERROR] Failed to delete folder:', err);
    }
    schedulePersistence(get);
  },

  saveEntry: async (weekId, entryData) => {
    set((state) => ({
      weeks: state.weeks.map((w) => {
        if (w.id !== weekId) return w;
        const exists = w.bullets.some((b) => b.id === entryData.id);
        const nextBullets = exists
          ? w.bullets.map((b) => (b.id === entryData.id ? entryData : b))
          : [...w.bullets, entryData];
        return { ...w, updatedAt: new Date().toISOString(), bullets: nextBullets };
      }),
    }));
    try {
      await saveEntryDoc(weekId, entryData);
      console.log('[Firestore SUCCESS] Entry saved:', entryData.id);
    } catch (err) {
      console.error('[Firestore CRITICAL ERROR] Failed to save entry:', err);
    }
    schedulePersistence(get, AUTO_SAVE_DEBOUNCE_MS, entryData.id);
  },

  deleteEntry: async (weekId, entryId) => {
    set((state) => ({
      weeks: state.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          bullets: w.bullets.filter((b) => b.id !== entryId),
        };
      }),
    }));
    try {
      await deleteEntryDoc(weekId, entryId);
      console.log('[Firestore SUCCESS] Entry deleted:', entryId);
    } catch (err) {
      console.error('[Firestore CRITICAL ERROR] Failed to delete entry:', err);
    }
    schedulePersistence(get);
  },

  // Week Operations
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
    saveWeekMetaDoc(newWeek).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to save new week meta:', err)
    );
    if (newWeek.bullets && newWeek.bullets.length > 0) {
      for (const bullet of newWeek.bullets) {
        saveEntryDoc(newWeek.id, bullet).catch((err) =>
          console.error('[Firestore CRITICAL ERROR] Failed to save initial bullet:', err)
        );
      }
    }
    schedulePersistence(get);
  },

  updateWeek: (updatedWeek) => {
    const prevWeek = get().weeks.find((w) => w.id === updatedWeek.id);

    set((state) => ({
      weeks: state.weeks.map((w) => (w.id === updatedWeek.id ? updatedWeek : w)),
    }));

    // Direct atomic commits for the week shell and bullet diffs
    saveWeekMetaDoc(updatedWeek).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to save updated week meta:', err)
    );

    if (prevWeek) {
      const prevBulletIds = new Set(prevWeek.bullets.map((b) => b.id));
      const nextBulletIds = new Set(updatedWeek.bullets.map((b) => b.id));

      // Save modified or added bullets
      for (const bullet of updatedWeek.bullets) {
        const prevBullet = prevWeek.bullets.find((b) => b.id === bullet.id);
        if (!prevBullet || JSON.stringify(prevBullet) !== JSON.stringify(bullet)) {
          saveEntryDoc(updatedWeek.id, bullet).catch((err) =>
            console.error(`[Firestore CRITICAL ERROR] Failed to atomic save bullet ${bullet.id}:`, err)
          );
        }
      }

      // Delete removed bullets
      for (const prevId of prevBulletIds) {
        if (!nextBulletIds.has(prevId)) {
          deleteEntryDoc(updatedWeek.id, prevId).catch((err) =>
            console.error(`[Firestore CRITICAL ERROR] Failed to atomic delete bullet ${prevId}:`, err)
          );
        }
      }
    } else {
      for (const bullet of updatedWeek.bullets) {
        saveEntryDoc(updatedWeek.id, bullet).catch((err) =>
          console.error(`[Firestore CRITICAL ERROR] Failed to atomic save bullet ${bullet.id}:`, err)
        );
      }
    }

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
    deleteWeekDoc(weekId).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to delete week doc:', err)
    );
    schedulePersistence(get);
  },

  reorderWeeks: (weeks) => {
    set({ weeks });
    for (const w of weeks) {
      saveWeekMetaDoc(w).catch(() => {});
    }
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

      if (isDateWithinWeek(dateObj, sourceWeek)) {
        const otherBullets = sourceWeek.bullets.filter((b) => b.id !== bulletId);
        const sortedBullets = sortBulletsByDate([...otherBullets, updatedBullet], 'asc');
        const nextWeeks = state.weeks.map((w) =>
          w.id === weekId
            ? { ...w, updatedAt: new Date().toISOString(), bullets: sortedBullets }
            : w
        );
        saveEntryDoc(weekId, updatedBullet).catch((err) =>
          console.error('[Firestore CRITICAL ERROR] Failed to save timestamp updated bullet:', err)
        );
        return { weeks: nextWeeks };
      }

      const { updatedWeeks, targetWeekId } = relocateBulletToMatchingWeek(
        updatedBullet,
        weekId,
        state.weeks
      );

      // Relocate bullet in Firestore
      deleteEntryDoc(weekId, bulletId).catch(() => {});
      if (targetWeekId) {
        saveEntryDoc(targetWeekId, updatedBullet).catch(() => {});
      }

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
        const coreMatch = state.coreItems.find((i) => i.id === entryId);
        if (coreMatch) {
          const updatedCore = {
            ...coreMatch,
            createdAt: isoTimestamp,
            updatedAt: new Date().toISOString(),
            timestamp: formattedTimestamp,
          };
          saveCoreTopicDoc(updatedCore).catch(() => {});
          return {
            coreItems: state.coreItems.map((i) => (i.id === entryId ? updatedCore : i)),
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
        saveEntryDoc(targetWeekId, updatedBullet).catch(() => {});
        return { weeks: nextWeeks };
      }

      const { updatedWeeks, targetWeekId: newWeekId } = relocateBulletToMatchingWeek(
        updatedBullet,
        targetWeekId,
        state.weeks
      );

      deleteEntryDoc(targetWeekId, entryId).catch(() => {});
      if (newWeekId) {
        saveEntryDoc(newWeekId, updatedBullet).catch(() => {});
      }

      return {
        weeks: updatedWeeks,
        activeWeekId: newWeekId || state.activeWeekId,
      };
    });

    schedulePersistence(get);
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

      saveWeekMetaDoc(updatedWeek).catch(() => {});

      return {
        weeks: sortedWeeks,
        activeWeekId: weekId,
      };
    });

    schedulePersistence(get);
  },

  setActiveWeekId: (id) => {
    if (get().saveStatus === 'unsaved') {
      get().flushAutoSave();
    }
    set({ activeWeekId: id });
  },

  // Core Topic Item Operations
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
    saveCoreTopicDoc(item).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to save core item:', err)
    );
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
    saveCoreTopicDoc(item).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to update core item:', err)
    );
    schedulePersistence(get);
  },

  deleteCoreItem: (id) => {
    const item = get().coreItems.find((i) => i.id === id);
    set((state) => ({
      coreItems: state.coreItems.filter((i) => i.id !== id),
    }));
    deleteCoreTopicDoc(id, item?.categoryId).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to delete core item:', err)
    );
    schedulePersistence(get);
  },

  toggleCompleteCoreItem: (item) => {
    const nextStatus: ItemActivityStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    const updated = { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    set((state) => ({
      coreItems: state.coreItems.map((i) =>
        i.id === item.id ? updated : i
      ),
    }));
    saveCoreTopicDoc(updated).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to toggle complete core item:', err)
    );
    schedulePersistence(get);
  },

  updateCoreItemStatus: (item, status) => {
    const updated = { ...item, status, updatedAt: new Date().toISOString() };
    set((state) => ({
      coreItems: state.coreItems.map((i) =>
        i.id === item.id ? updated : i
      ),
    }));
    saveCoreTopicDoc(updated).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to update core item status:', err)
    );
    schedulePersistence(get);
  },

  setActiveCoreCategory: (catId) => {
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

  // Folder / Category Operations
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
    saveFolderDoc(newCat).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to save folder doc:', err)
    );
    saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    schedulePersistence(get);
  },

  updateCoreCategory: (catId, updated) => {
    let updatedCat: CoreCategoryConfig | null = null;
    set((state) => {
      const nextCategories = state.coreCategories.map((c) => {
        if (c.id === catId) {
          updatedCat = { ...c, ...updated, updatedAt: new Date().toISOString() };
          return updatedCat;
        }
        return c;
      });
      return { coreCategories: nextCategories };
    });
    if (updatedCat) {
      saveFolderDoc(updatedCat).catch((err) =>
        console.error('[Firestore CRITICAL ERROR] Failed to update folder doc:', err)
      );
      saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    }
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
    deleteFolderDoc(catId).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to delete folder doc:', err)
    );
    saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    schedulePersistence(get);
  },

  reorderCoreCategories: (cats) => {
    set({ coreCategories: cats });
    for (const c of cats) {
      saveFolderDoc(c).catch(() => {});
    }
    saveCoreCategoriesDoc(cats).catch(() => {});
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
    let parentCat: CoreCategoryConfig | null = null;
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId) {
          const currentSubs = c.subCategories || [];
          const exists = currentSubs.some((s) => s.id === subCategory.id);
          const nextSubs = exists
            ? currentSubs.map((s) => (s.id === subCategory.id ? subCategory : s))
            : [...currentSubs, subCategory];
          parentCat = {
            ...c,
            subCategories: nextSubs,
            updatedAt: new Date().toISOString(),
          };
          return parentCat;
        }
        return c;
      });
      return { coreCategories: updatedCats };
    });
    if (parentCat) {
      saveFolderDoc(parentCat).catch(() => {});
      saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    }
    schedulePersistence(get);
  },

  updateSubCategory: (categoryId, subCategoryId, updated) => {
    let parentCat: CoreCategoryConfig | null = null;
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId && c.subCategories) {
          parentCat = {
            ...c,
            subCategories: c.subCategories.map((s) => (s.id === subCategoryId ? { ...s, ...updated } : s)),
            updatedAt: new Date().toISOString(),
          };
          return parentCat;
        }
        return c;
      });
      return { coreCategories: updatedCats };
    });
    if (parentCat) {
      saveFolderDoc(parentCat).catch(() => {});
      saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    }
    schedulePersistence(get);
  },

  deleteSubCategory: (categoryId, subCategoryId) => {
    let parentCat: CoreCategoryConfig | null = null;
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId && c.subCategories) {
          parentCat = {
            ...c,
            subCategories: c.subCategories.filter((s) => s.id !== subCategoryId),
            updatedAt: new Date().toISOString(),
          };
          return parentCat;
        }
        return c;
      });
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
    if (parentCat) {
      saveFolderDoc(parentCat).catch(() => {});
      saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    }
    schedulePersistence(get);
  },

  reorderSubCategories: (categoryId, subCategories) => {
    let parentCat: CoreCategoryConfig | null = null;
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => {
        if (c.id === categoryId) {
          parentCat = { ...c, subCategories, updatedAt: new Date().toISOString() };
          return parentCat;
        }
        return c;
      });
      return { coreCategories: updatedCats };
    });
    if (parentCat) {
      saveFolderDoc(parentCat).catch(() => {});
      saveCoreCategoriesDoc(get().coreCategories).catch(() => {});
    }
    schedulePersistence(get);
  },

  moveCoreItemToSubCategory: (itemId, targetCategoryId, targetSubCategoryId) => {
    let movedItem: CoreTopicItem | null = null;
    set((state) => ({
      coreItems: state.coreItems.map((item) => {
        if (item.id === itemId) {
          movedItem = {
            ...item,
            categoryId: targetCategoryId,
            subCategoryId: targetSubCategoryId || undefined,
            updatedAt: new Date().toISOString(),
          };
          return movedItem;
        }
        return item;
      }),
    }));
    if (movedItem) {
      saveCoreTopicDoc(movedItem).catch(() => {});
    }
    schedulePersistence(get);
  },

  // Theme & Filter Settings
  setTheme: (theme) => {
    set({ theme });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('app_theme', theme);
      }
    } catch {}
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
    saveCommentDoc(newComment).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to save comment:', err)
    );
    schedulePersistence(get);
  },

  resolveComment: (id) => {
    let resolvedItem: CommentItem | null = null;
    set((state) => ({
      comments: state.comments.map((c) => {
        if (c.id === id) {
          resolvedItem = { ...c, resolved: !c.resolved };
          return resolvedItem;
        }
        return c;
      }),
    }));
    if (resolvedItem) {
      saveCommentDoc(resolvedItem).catch(() => {});
    }
    schedulePersistence(get);
  },

  deleteComment: (id) => {
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
    }));
    deleteCommentDoc(id).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to delete comment:', err)
    );
    schedulePersistence(get);
  },

  editComment: (id, newContent) => {
    let editedItem: CommentItem | null = null;
    set((state) => ({
      comments: state.comments.map((c) => {
        if (c.id === id) {
          editedItem = { ...c, content: newContent };
          return editedItem;
        }
        return c;
      }),
    }));
    if (editedItem) {
      saveCommentDoc(editedItem).catch(() => {});
    }
    schedulePersistence(get);
  },

  // Takeaway Pinning
  togglePinTakeaway: (bullet, week) => {
    set((state) => {
      const isCurrentlyPinned = Boolean(bullet.pinnedToLearned);
      const newPinnedState = !isCurrentlyPinned;

      const updatedBullet = { ...bullet, pinnedToLearned: newPinnedState };
      const updatedWeeks = state.weeks.map((w) => {
        if (w.id !== week.id) return w;
        return {
          ...w,
          bullets: w.bullets.map((b) => (b.id === bullet.id ? updatedBullet : b)),
        };
      });

      saveEntryDoc(week.id, updatedBullet).catch(() => {});

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
        saveCoreTopicDoc(newItem).catch(() => {});
      } else {
        const found = updatedCoreItems.find((item) => item.pinnedBulletId === bullet.id);
        if (found) {
          deleteCoreTopicDoc(found.id, found.categoryId).catch(() => {});
        }
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
    const cleanEmail = email.trim().toLowerCase();
    set({
      currentUser: {
        uid: `sim-${role}-${Date.now()}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
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
    if (cloudData.clientSessionId && cloudData.clientSessionId === CLIENT_SESSION_ID) {
      return;
    }

    const state = get();
    const isUserActivelyTyping =
      state.saveStatus === 'unsaved' ||
      Date.now() - lastUserKeystrokeTime < 2500 ||
      Date.now() - lastLocalMutationTime < 2500;

    const incomingWeeks = cloudData.weeks && Array.isArray(cloudData.weeks) ? cloudData.weeks : state.weeks;
    const incomingCoreItems = cloudData.coreItems && Array.isArray(cloudData.coreItems) ? cloudData.coreItems : state.coreItems;
    const incomingCoreCategories = cloudData.coreCategories && Array.isArray(cloudData.coreCategories) ? cloudData.coreCategories : state.coreCategories;
    const incomingPinnedCategoryIds = cloudData.pinnedCategoryIds && Array.isArray(cloudData.pinnedCategoryIds) ? cloudData.pinnedCategoryIds : state.pinnedCategoryIds;
    const incomingComments = cloudData.comments && Array.isArray(cloudData.comments) ? cloudData.comments : state.comments;

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
      let nextCoreItems = incomingCoreItems;

      if (isUserActivelyTyping) {
        nextWeeks = incomingWeeks.map((remoteWeek) => {
          if (remoteWeek.id === currentState.activeWeekId) {
            const currentActiveWeek = currentState.weeks.find((w) => w.id === currentState.activeWeekId);
            return currentActiveWeek || remoteWeek;
          }
          return remoteWeek;
        });

        nextCoreCategories = incomingCoreCategories.map((remoteCat) => {
          if (remoteCat.id === currentState.activeCoreCategory) {
            const currentActiveCat = currentState.coreCategories.find((c) => c.id === currentState.activeCoreCategory);
            return currentActiveCat || remoteCat;
          }
          return remoteCat;
        });

        nextCoreItems = incomingCoreItems.map((remoteItem) => {
          const localItem = currentState.coreItems.find((ci) => ci.id === remoteItem.id);
          if (
            localItem &&
            localItem.updatedAt &&
            (!remoteItem.updatedAt || new Date(localItem.updatedAt) >= new Date(remoteItem.updatedAt))
          ) {
            return localItem;
          }
          return remoteItem;
        });
        currentState.coreItems.forEach((localItem) => {
          if (!nextCoreItems.some((ni) => ni.id === localItem.id)) {
            nextCoreItems.push(localItem);
          }
        });
      }

      const hasActiveWeek = nextWeeks.some((w) => w.id === currentState.activeWeekId);
      const activeWeekId = hasActiveWeek
        ? currentState.activeWeekId
        : currentState.activeWeekId || nextWeeks[0]?.id || '';

      const hasActiveCat = nextCoreCategories.some((c) => c.id === currentState.activeCoreCategory);
      const activeCoreCategory = hasActiveCat
        ? currentState.activeCoreCategory
        : currentState.activeCoreCategory || nextCoreCategories[0]?.id || '';

      return {
        isHydrated: true,
        weeks: nextWeeks,
        coreItems: nextCoreItems,
        coreCategories: nextCoreCategories,
        pinnedCategoryIds: incomingPinnedCategoryIds,
        comments: incomingComments,
        activeWeekId,
        activeCoreCategory,
      };
    });

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

// Atomic Selector Hooks
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
export const useIsHydrated = () => useJournalStore((s) => s.isHydrated);
export const useCreateFolder = () => useJournalStore((s) => s.createFolder);
export const useSaveEntry = () => useJournalStore((s) => s.saveEntry);
