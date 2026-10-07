import { create } from 'zustand';
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
  HonestSaveStatus,
} from '../types';
import { CORE_CATEGORIES_CONFIG, INITIAL_COMMENTS, INITIAL_CORE_ITEMS, INITIAL_WEEKS } from '../data/initialData';
import {
  formatTimestamp,
  loadAppState,
  saveAppState,
  parseDateFromTimestamp,
  getWeekTitleAndRangeForDate,
  getHasReceivedFirstFirestoreSnapshot,
  setHasReceivedFirstFirestoreSnapshot as setGlobalFirestoreSnapshotReceived,
} from '../utils/storage';
import {
  relocateBulletToMatchingWeek,
  sortBulletsByDate,
  sortWeeksChronologically,
  isDateWithinWeek,
  getEntryDate,
  findMatchingWeekForDate,
  findOverlappingWeek,
  weeksOverlap,
  normalizeDateToIso,
} from '../utils/dateUtils';
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
  saveFolderDoc,
  deleteFolderDoc,
  saveCoreTopicDoc,
  deleteCoreTopicDoc,
  saveWeekDoc,
  saveWeekMetaDoc,
  deleteWeekDoc,
  saveCommentDoc,
  deleteCommentDoc,
  saveCoreCategoriesDoc,
  saveAppStateDoc,
} from '../lib/firebase';

const INITIAL_USER_PROFILE: CurrentUserProfile = {
  uid: '',
  email: '',
  displayName: '',
  isLoggedIn: false,
  role: 'unauthorized',
  isSimulated: false,
};

export type AutoSaveStatus = HonestSaveStatus;

export interface JournalStoreState {
  // Hydration state (prevents unhydrated state from overwriting Firestore)
  isHydrated: boolean;
  setIsHydrated: (isHydrated: boolean) => void;
  hasReceivedFirstFirestoreSnapshot: boolean;
  setHasReceivedFirstFirestoreSnapshot: (hasReceived: boolean) => void;

  // Data state (clean empty defaults)
  weeks: WeeklyBlock[];
  activeWeekId: string;
  coreItems: CoreTopicItem[];
  activeCoreCategory: CoreCategoryId;
  activeCoreSubCategory?: string;
  coreCategories: CoreCategoryConfig[];
  pinnedCategoryIds: string[];
  introQuotes: string[];
  theme: 'light' | 'dark';
  accentTheme: AccentTheme;
  filters: FilterOptions;
  comments: CommentItem[];
  viewMode: ViewMode;

  // Auto-Save status & telemetry
  saveStatus: AutoSaveStatus;
  lastCloudSavedAt: number | null;
  lastSavedAt: string | null;

  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;

  // Modals & UI navigation state
  isExportModalOpen: boolean;
  isAccessManagementOpen: boolean;
  isQuotesModalOpen: boolean;
  isCommentsSidebarOpen: boolean;
  isRecentlyDeletedOpen: boolean;
  setIsRecentlyDeletedOpen: (open: boolean) => void;
  activeCommentSectionTag?: string;
  isOpenMobile: boolean;
  isSidebarOpen: boolean;
  isFullScreen: boolean;
  isEditorOpen: boolean;

  // Auth & Permissions state
  permissions: PermissionsDoc;
  currentUser: CurrentUserProfile;
  previewGuest: { email: string; role: UserRole } | null;
  setPreviewGuest: (guest: { email: string; role: UserRole } | null) => void;

  // Direct Atomic Action methods
  createFolder: (folderData: CoreCategoryConfig) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  saveEntry: (weekId: string, entryData: BulletPoint) => Promise<void>;
  deleteEntry: (weekId: string, entryId: string) => Promise<void>;

  setWeeks: (weeksOrUpdater: WeeklyBlock[] | ((prev: WeeklyBlock[]) => WeeklyBlock[])) => void;
  addWeek: (newWeek: WeeklyBlock) => void;
  startThisWeek: () => void;
  updateWeek: (updatedWeek: WeeklyBlock) => void;
  togglePinWeek: (weekId: string) => void;
  deleteWeek: (weekId: string) => void;
  moveEntryToWeek: (sourceWeekId: string, targetWeekId: string, entryId: string) => void;
  mergeWeekInto: (sourceWeekId: string, targetWeekId: string) => void;
  restoreItem: (type: 'week' | 'entry' | 'folder' | 'note', id: string, parentId?: string) => void;
  permanentlyDeleteItem: (type: 'week' | 'entry' | 'folder' | 'note', id: string, parentId?: string) => Promise<void>;
  purgeOldDeletedItems: () => void;
  retrySave: () => Promise<void>;
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

  setIntroQuotes: (quotes: string[]) => Promise<void>;
  addIntroQuote: (quote: string) => Promise<void>;
  removeIntroQuote: (index: number) => Promise<void>;

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

  nextSessionAt: string | null;
  sessionPrepNotes: string;
  isSessionPrepOpen: boolean;
  setIsSessionPrepOpen: (isOpen: boolean) => void;
  setNextSessionAt: (nextSessionAt: string | null) => void;
  setSessionPrepNotes: (notes: string) => void;
  toggleEntryForSession: (weekId: string, bulletId: string) => void;
  setEntryDiscussed: (weekId: string, bulletId: string, discussed: boolean) => void;

  flushAutoSave: (entryId?: string) => Promise<void>;

  setIsExportModalOpen: (isOpen: boolean) => void;
  setIsAccessManagementOpen: (isOpen: boolean) => void;
  setIsQuotesModalOpen: (isOpen: boolean) => void;
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
  logout: () => Promise<void>;

  syncFromCloud: (cloudData: Partial<AppState> & { clientSessionId?: string; updatedAt?: string; isInitialHydrationComplete?: boolean }) => void;
  resetAllData: () => void;
}

// Dirty tracking sets to prevent bulk writes and ensure only user-modified documents are persisted
const dirtyWeekIds = new Set<string>();
const deletedWeekIds = new Set<string>();
const dirtyFolderIds = new Set<string>();
const deletedFolderIds = new Set<string>();
const dirtyCoreItemIds = new Set<string>();
const deletedCoreItemIds = new Set<string>();
let isAppStateDirty = false;
let hasPurgedThisSession = false;

export function markWeekDirty(weekId: string) {
  if (!weekId) return;
  dirtyWeekIds.add(weekId);
  deletedWeekIds.delete(weekId);
}

export function markWeekDeleted(weekId: string) {
  if (!weekId) return;
  deletedWeekIds.add(weekId);
  dirtyWeekIds.delete(weekId);
}

export function markFolderDirty(folderId: string) {
  if (!folderId) return;
  dirtyFolderIds.add(folderId);
  deletedFolderIds.delete(folderId);
}

export function markFolderDeleted(folderId: string) {
  if (!folderId) return;
  deletedFolderIds.add(folderId);
  dirtyFolderIds.delete(folderId);
}

export function markCoreItemDirty(itemId: string) {
  if (!itemId) return;
  dirtyCoreItemIds.add(itemId);
  deletedCoreItemIds.delete(itemId);
}

export function markCoreItemDeleted(itemId: string) {
  if (!itemId) return;
  deletedCoreItemIds.add(itemId);
  dirtyCoreItemIds.delete(itemId);
}

export function markAppStateDirty() {
  isAppStateDirty = true;
}

export function clearDirtyTracking() {
  dirtyWeekIds.clear();
  deletedWeekIds.clear();
  dirtyFolderIds.clear();
  deletedFolderIds.clear();
  dirtyCoreItemIds.clear();
  deletedCoreItemIds.clear();
  isAppStateDirty = false;
}

export function hasDirtyItems(): boolean {
  return (
    dirtyWeekIds.size > 0 ||
    deletedWeekIds.size > 0 ||
    dirtyFolderIds.size > 0 ||
    deletedFolderIds.size > 0 ||
    dirtyCoreItemIds.size > 0 ||
    deletedCoreItemIds.size > 0 ||
    isAppStateDirty
  );
}

// Debounced background persistence helper (600ms debounce)
const AUTO_SAVE_DEBOUNCE_MS = 600;
let syncTimeout: any = null;
let lastLocalMutationTime = 0;
let lastUserKeystrokeTime = 0;
let isSyncInProgress = false;
let pendingSaveAfterSync = false;
let pendingTargetEntryId: string | undefined = undefined;

const executeSave = async (get: () => JournalStoreState, targetId?: string) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  const s = get();

  // Guard: Safe preview mode (zero writes or cloud saves)
  if (s.previewGuest != null) {
    return;
  }

  // Guard: Offline check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
      introQuotes: s.introQuotes,
      filters: s.filters,
      comments: s.comments,
    };
    saveAppState(appState);
    useJournalStore.setState({ saveStatus: 'offline' });
    return;
  }

  // HYDRATION & SNAPSHOT GUARD: Block writing local fallback state to Firestore until weeks, folders, and core_topics snapshots have all been received and applied
  if (!s.isHydrated || !s.hasReceivedFirstFirestoreSnapshot || !getHasReceivedFirstFirestoreSnapshot()) {
    console.warn('[Auto-Save Guard] Save blocked: waiting for required Firestore snapshots (weeks, folders, core_topics) before writing to Cloud.');
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
      introQuotes: s.introQuotes,
      filters: s.filters,
      comments: s.comments,
    };
    saveAppState(appState);
    useJournalStore.setState({ saveStatus: 'saved_local' });
    return;
  }

  // Guard: If user typed within the debounce window, reschedule for smooth input flow
  const timeSinceLastKeystroke = Date.now() - lastUserKeystrokeTime;
  if (timeSinceLastKeystroke < AUTO_SAVE_DEBOUNCE_MS && lastUserKeystrokeTime > 0) {
    const remainingDelay = Math.max(250, AUTO_SAVE_DEBOUNCE_MS - timeSinceLastKeystroke);
    syncTimeout = setTimeout(() => {
      executeSave(get, targetId || pendingTargetEntryId);
    }, remainingDelay);
    return;
  }

  if (isSyncInProgress) {
    pendingSaveAfterSync = true;
    if (targetId) pendingTargetEntryId = targetId;
    return;
  }

  // 1. Immediate LocalStorage / IndexedDB Backup
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
    introQuotes: s.introQuotes,
    nextSessionAt: s.nextSessionAt,
    sessionPrepNotes: s.sessionPrepNotes,
    filters: s.filters,
    comments: s.comments,
  };
  saveAppState(appState);

  // 2. Cloud Firestore Dispatch
  const hasWritePermission =
    s.currentUser?.isLoggedIn &&
    (s.currentUser.role === 'owner' || s.currentUser.role === 'editor');

  if (!hasWritePermission) {
    const roleStr = s.currentUser?.role || 'unauthorized';
    console.log(`[Auto-Save] Firestore write skipped due to insufficient permissions (role: ${roleStr}). Saved to local storage only.`);
    useJournalStore.setState({
      saveStatus: 'saved_local',
      lastSavedAt: 'Saved on this device only',
    });
    pendingTargetEntryId = undefined;
    return;
  }

  const effectiveTargetId = targetId || pendingTargetEntryId;
  if (effectiveTargetId) {
    const matchingWeek = s.weeks.find((w) => w.id === effectiveTargetId || w.bullets?.some((b) => b.id === effectiveTargetId));
    if (matchingWeek) {
      markWeekDirty(matchingWeek.id);
    }
  }

  if (!hasDirtyItems()) {
    const lastCloud = useJournalStore.getState().lastCloudSavedAt;
    useJournalStore.setState({
      saveStatus: lastCloud != null ? 'saved_cloud' : 'saved_local',
    });
    pendingTargetEntryId = undefined;
    return;
  }

  isSyncInProgress = true;
  useJournalStore.setState({ saveStatus: 'saving' });

  try {
    const weeksToSave = Array.from(dirtyWeekIds);
    const weeksToDelete = Array.from(deletedWeekIds);
    const foldersToSave = Array.from(dirtyFolderIds);
    const foldersToDelete = Array.from(deletedFolderIds);
    const coreItemsToSave = Array.from(dirtyCoreItemIds);
    const coreItemsToDelete = Array.from(deletedCoreItemIds);
    const shouldSaveAppState = isAppStateDirty;

    const savedSummaries: string[] = [];

    // Save only dirty weeks
    for (const wId of weeksToSave) {
      const week = s.weeks.find((w) => w.id === wId);
      if (week) {
        await saveWeekDoc(week);
        dirtyWeekIds.delete(wId);
        savedSummaries.push(`week:${wId}`);
      } else {
        dirtyWeekIds.delete(wId);
      }
    }

    // Delete deleted weeks
    for (const wId of weeksToDelete) {
      await deleteWeekDoc(wId);
      deletedWeekIds.delete(wId);
      savedSummaries.push(`deleted-week:${wId}`);
    }

    // Save only dirty folders
    for (const fId of foldersToSave) {
      const folder = s.coreCategories.find((c) => c.id === fId);
      if (folder) {
        await saveFolderDoc(folder);
        dirtyFolderIds.delete(fId);
        savedSummaries.push(`folder:${fId}`);
      } else {
        dirtyFolderIds.delete(fId);
      }
    }

    // Delete deleted folders
    for (const fId of foldersToDelete) {
      await deleteFolderDoc(fId);
      deletedFolderIds.delete(fId);
      savedSummaries.push(`deleted-folder:${fId}`);
    }

    // Save only dirty core items
    for (const itemId of coreItemsToSave) {
      const item = s.coreItems.find((i) => i.id === itemId);
      if (item) {
        await saveCoreTopicDoc(item);
        dirtyCoreItemIds.delete(itemId);
        savedSummaries.push(`item:${itemId}`);
      } else {
        dirtyCoreItemIds.delete(itemId);
      }
    }

    // Delete deleted core items
    for (const itemId of coreItemsToDelete) {
      await deleteCoreTopicDoc(itemId);
      deletedCoreItemIds.delete(itemId);
      savedSummaries.push(`deleted-item:${itemId}`);
    }

    // Save only dirty app_state
    if (shouldSaveAppState) {
      await saveAppStateDoc({
        pinnedCategoryIds: s.pinnedCategoryIds,
        introQuotes: s.introQuotes,
        nextSessionAt: s.nextSessionAt,
        sessionPrepNotes: s.sessionPrepNotes,
      });
      isAppStateDirty = false;
      savedSummaries.push('app_state:journal');
    }

    const now = Date.now();
    useJournalStore.setState({
      saveStatus: 'saved_cloud',
      lastCloudSavedAt: now,
    });
    if (savedSummaries.length > 0) {
      console.log('[Auto-Save] Specific dirty documents saved to Firestore:', savedSummaries.join(', '));
    }
    pendingTargetEntryId = undefined;
  } catch (err) {
    console.error('[Auto-Save] Cloud write error, items kept dirty for retry:', err);
    useJournalStore.setState({ saveStatus: 'error' });
  } finally {
    isSyncInProgress = false;
    if (pendingSaveAfterSync) {
      pendingSaveAfterSync = false;
      schedulePersistence(get, 200, pendingTargetEntryId);
    }
  }
};

const schedulePersistence = (get: () => JournalStoreState, delayMs = AUTO_SAVE_DEBOUNCE_MS, targetId?: string) => {
  if (get().previewGuest != null) return;
  lastLocalMutationTime = Date.now();
  lastUserKeystrokeTime = Date.now();
  if (targetId) {
    pendingTargetEntryId = targetId;
    const s = get();
    const matchingWeek = s.weeks.find((w) => w.id === targetId || w.bullets?.some((b) => b.id === targetId));
    if (matchingWeek) {
      markWeekDirty(matchingWeek.id);
    }
  }

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
      introQuotes: s.introQuotes,
      filters: s.filters,
      comments: s.comments,
    });
  } catch (err) {
    console.warn('Immediate local cache save note:', err);
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useJournalStore.setState({ saveStatus: 'offline' });
  } else {
    useJournalStore.setState({ saveStatus: 'saving' });
  }

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    executeSave(get, targetId);
  }, delayMs);
};

// Global window lifecycle listener: flush pending debounced saves strictly on actual tab unload if unsaved
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (useJournalStore.getState().saveStatus === 'saving' || syncTimeout || hasDirtyItems()) {
      useJournalStore.getState().flushAutoSave();
    }
  });

  window.addEventListener('online', () => {
    const s = useJournalStore.getState();
    if (hasDirtyItems()) {
      executeSave(useJournalStore.getState);
    } else if (s.lastCloudSavedAt != null) {
      useJournalStore.setState({ saveStatus: 'saved_cloud' });
    } else {
      useJournalStore.setState({ saveStatus: 'saved_local' });
    }
  });

  window.addEventListener('offline', () => {
    useJournalStore.setState({ saveStatus: 'offline' });
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
  hasReceivedFirstFirestoreSnapshot: false,
  setHasReceivedFirstFirestoreSnapshot: (hasReceivedFirstFirestoreSnapshot) => {
    setGlobalFirestoreSnapshotReceived(hasReceivedFirstFirestoreSnapshot);
    set({ hasReceivedFirstFirestoreSnapshot });
  },

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
  introQuotes: Array.isArray(initialLoaded.introQuotes) ? initialLoaded.introQuotes : [],
  theme: initialLoaded.theme || 'dark',
  accentTheme: initialLoaded.accentTheme || 'amber',
  filters: initialLoaded.filters || {
    searchQuery: '',
    hasMediaOnly: false,
    hasTherapistAnswersOnly: false,
    dateRange: 'all',
    sortOrder: 'newest',
  },
  comments: Array.isArray(initialLoaded.comments) ? initialLoaded.comments : INITIAL_COMMENTS,
  viewMode: 'home',

  saveStatus: (typeof navigator !== 'undefined' && !navigator.onLine) ? 'offline' : 'saved_local',
  lastCloudSavedAt: null,
  lastSavedAt: null,

  toastMessage: null,
  showToast: (msg: string) => set({ toastMessage: msg }),
  hideToast: () => set({ toastMessage: null }),

  isRecentlyDeletedOpen: false,
  setIsRecentlyDeletedOpen: (isRecentlyDeletedOpen: boolean) => set({ isRecentlyDeletedOpen }),

  retrySave: async () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    await executeSave(get);
  },

  flushAutoSave: async (entryId?: string) => {
    if (get().previewGuest != null) return;
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    await executeSave(get, entryId);
  },

  isExportModalOpen: false,
  isAccessManagementOpen: false,
  isQuotesModalOpen: false,
  isCommentsSidebarOpen: false,
  activeCommentSectionTag: undefined,
  isOpenMobile: false,
  isSidebarOpen: true,
  isFullScreen: false,
  isEditorOpen: true,

  nextSessionAt: initialLoaded.nextSessionAt || null,
  sessionPrepNotes: initialLoaded.sessionPrepNotes || '',
  isSessionPrepOpen: false,

  permissions: DEFAULT_PERMISSIONS,
  currentUser: INITIAL_USER_PROFILE,
  previewGuest: null,
  setPreviewGuest: (previewGuest) => set({ previewGuest }),

  // Direct Atomic Helper Handlers
  createFolder: async (folderData) => {
    if (get().previewGuest != null) return;
    markFolderDirty(folderData.id);
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
    if (get().previewGuest != null) return;
    const cat = get().coreCategories.find((c) => c.id === folderId);
    if (!cat) return;
    const deletedAt = new Date().toISOString();
    markFolderDirty(folderId);
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => (c.id === folderId ? { ...c, deletedAt } : c));
      const remainingCats = updatedCats.filter((c) => !c.deletedAt);
      let nextActiveCat = state.activeCoreCategory;
      if (state.activeCoreCategory === folderId) {
        nextActiveCat = remainingCats[0]?.id || 'what-to-text-her';
      }
      return {
        coreCategories: updatedCats,
        activeCoreCategory: nextActiveCat,
      };
    });
    schedulePersistence(get);
    get().showToast(`Moved folder "${cat.title}" to Recently Deleted`);
  },

  saveEntry: async (weekId, entryData) => {
    if (get().previewGuest != null) return;
    let updatedWeek: WeeklyBlock | undefined;
    const currentWeeks = get().weeks;
    let targetWeek = currentWeeks.find((w) => w.id === weekId);

    // If no direct weekId match, search for an existing week covering the entry's target date
    if (!targetWeek) {
      const entryDate = getEntryDate(entryData.isoDate || entryData.timestamp || entryData.createdAt);
      targetWeek = findMatchingWeekForDate(entryDate, currentWeeks);
    }

    if (targetWeek) {
      const exists = targetWeek.bullets.some((b) => b.id === entryData.id);
      const nextBullets = exists
        ? targetWeek.bullets.map((b) => (b.id === entryData.id ? entryData : b))
        : sortBulletsByDate([...targetWeek.bullets, entryData], 'asc');
      updatedWeek = { ...targetWeek, updatedAt: new Date().toISOString(), bullets: nextBullets };

      set((state) => ({
        weeks: state.weeks.map((w) => (w.id === targetWeek!.id ? updatedWeek! : w)),
        activeWeekId: targetWeek!.id,
      }));
    } else {
      const entryDate = getEntryDate(entryData.isoDate || entryData.timestamp || entryData.createdAt);
      const { weekTitle, startDate, endDate } = getWeekTitleAndRangeForDate(entryDate);
      const newWeek: WeeklyBlock = {
        id: weekId && weekId.startsWith('week-') ? weekId : 'week-' + Date.now(),
        weekTitle,
        startDate,
        endDate,
        createdAt: entryData.isoDate || entryData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bullets: [entryData],
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
      updatedWeek = newWeek;
      set((state) => ({
        weeks: sortWeeksChronologically([newWeek, ...state.weeks], 'desc'),
        activeWeekId: newWeek.id,
      }));
    }

    if (updatedWeek) {
      markWeekDirty(updatedWeek.id);
      try {
        await saveWeekDoc(updatedWeek);
        console.log('[Firestore SUCCESS] Week saved with entry into bullets array:', entryData.id);
      } catch (err) {
        console.error('[Firestore CRITICAL ERROR] Failed to save week with entry:', err);
      }
    }
    schedulePersistence(get, AUTO_SAVE_DEBOUNCE_MS, entryData.id);
  },

  deleteEntry: async (weekId, entryId) => {
    if (get().previewGuest != null) return;
    markWeekDirty(weekId);
    const deletedAt = new Date().toISOString();
    set((state) => ({
      weeks: state.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          bullets: w.bullets.map((b) => (b.id === entryId ? { ...b, deletedAt } : b)),
        };
      }),
    }));
    schedulePersistence(get);
    get().showToast('Moved entry to Recently Deleted');
  },

  // Week Operations
  setWeeks: (weeksOrUpdater) => {
    if (get().previewGuest != null) return;
    set((state) => {
      const nextWeeks = typeof weeksOrUpdater === 'function' ? weeksOrUpdater(state.weeks) : weeksOrUpdater;
      for (const nw of nextWeeks) {
        const prev = state.weeks.find((w) => w.id === nw.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(nw)) {
          markWeekDirty(nw.id);
        }
      }
      return { weeks: nextWeeks };
    });
    schedulePersistence(get);
  },

  startThisWeek: () => {
    if (get().previewGuest != null) return;
    const { weekTitle, startDate, endDate } = getWeekTitleAndRangeForDate(new Date());
    const nonDeleted = get().weeks.filter((w) => !w.deletedAt);
    const overlapping = findOverlappingWeek(startDate, endDate, weekTitle, undefined, nonDeleted);

    if (overlapping) {
      set({ activeWeekId: overlapping.id, viewMode: 'weekly' });
      get().showToast(`Week already exists: opened "${overlapping.weekTitle}"`);
      return;
    }

    const newWeek: WeeklyBlock = {
      id: 'week-' + Date.now(),
      weekTitle,
      startDate,
      endDate,
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

    markWeekDirty(newWeek.id);
    set((state) => ({
      weeks: [newWeek, ...state.weeks],
      activeWeekId: newWeek.id,
      viewMode: 'weekly',
    }));
    schedulePersistence(get);
    get().showToast(`Started "${weekTitle}"`);
  },

  addWeek: (newWeek) => {
    if (get().previewGuest != null) return;
    const normalizedWeek: WeeklyBlock = {
      ...newWeek,
      startDate: newWeek.startDate ? normalizeDateToIso(newWeek.startDate) : newWeek.startDate,
      endDate: newWeek.endDate ? normalizeDateToIso(newWeek.endDate) : newWeek.endDate,
    };
    const nonDeleted = get().weeks.filter((w) => !w.deletedAt);
    const overlapping = findOverlappingWeek(
      normalizedWeek.startDate,
      normalizedWeek.endDate,
      normalizedWeek.weekTitle,
      normalizedWeek.id,
      nonDeleted
    );

    if (overlapping) {
      if (normalizedWeek.bullets && normalizedWeek.bullets.length > 0) {
        const existingBullets = [...(overlapping.bullets || [])];
        for (const b of normalizedWeek.bullets) {
          if (!existingBullets.some((eb) => eb.id === b.id)) {
            existingBullets.push(b);
          }
        }
        const updatedWeek: WeeklyBlock = {
          ...overlapping,
          updatedAt: new Date().toISOString(),
          bullets: sortBulletsByDate(existingBullets, 'asc'),
        };
        get().updateWeek(updatedWeek);
      }
      set({ activeWeekId: overlapping.id, viewMode: 'weekly' });
      get().showToast(`Week already exists: opened "${overlapping.weekTitle}"`);
      return;
    }

    markWeekDirty(normalizedWeek.id);
    set((state) => ({
      weeks: [normalizedWeek, ...state.weeks],
      activeWeekId: normalizedWeek.id,
      viewMode: 'weekly',
    }));
    schedulePersistence(get);
  },

  updateWeek: (updatedWeek) => {
    if (get().previewGuest != null) return;
    const normalizedWeek: WeeklyBlock = {
      ...updatedWeek,
      startDate: updatedWeek.startDate ? normalizeDateToIso(updatedWeek.startDate) : updatedWeek.startDate,
      endDate: updatedWeek.endDate ? normalizeDateToIso(updatedWeek.endDate) : updatedWeek.endDate,
    };
    markWeekDirty(normalizedWeek.id);
    set((state) => ({
      weeks: state.weeks.map((w) => (w.id === normalizedWeek.id ? normalizedWeek : w)),
    }));
    schedulePersistence(get);
  },

  togglePinWeek: (weekId) => {
    if (get().previewGuest != null) return;
    const s = get();
    const target = s.weeks.find((w) => w.id === weekId);
    if (!target) return;
    const isCurrentlyPinned = Boolean(target.isPinned);
    const updatedWeek: WeeklyBlock = {
      ...target,
      isPinned: !isCurrentlyPinned,
      updatedAt: new Date().toISOString(),
    };
    markWeekDirty(updatedWeek.id);
    set((state) => ({
      weeks: state.weeks.map((w) => (w.id === updatedWeek.id ? updatedWeek : w)),
    }));
    schedulePersistence(get);
  },

  deleteWeek: (weekId) => {
    if (get().previewGuest != null) return;
    const week = get().weeks.find((w) => w.id === weekId);
    if (!week) return;
    const deletedAt = new Date().toISOString();
    markWeekDirty(weekId);
    set((state) => {
      const updated = state.weeks.map((w) => (w.id === weekId ? { ...w, deletedAt } : w));
      const remaining = updated.filter((w) => !w.deletedAt);
      const nextActiveId = state.activeWeekId === weekId ? remaining[0]?.id || '' : state.activeWeekId;
      return {
        weeks: updated,
        activeWeekId: nextActiveId,
      };
    });
    schedulePersistence(get);
    get().showToast(`Moved "${week.weekTitle}" to Recently Deleted`);
  },

  moveEntryToWeek: (sourceWeekId, targetWeekId, entryId) => {
    if (get().previewGuest != null) return;
    const state = get();
    const sourceWeek = state.weeks.find((w) => w.id === sourceWeekId);
    const targetWeek = state.weeks.find((w) => w.id === targetWeekId);
    if (!sourceWeek || !targetWeek) return;

    const bullet = (sourceWeek.bullets || []).find((b) => b.id === entryId);
    if (!bullet) return;

    const updatedSourceBullets = (sourceWeek.bullets || []).filter((b) => b.id !== entryId);
    const updatedTargetBullets = sortBulletsByDate([...(targetWeek.bullets || []), bullet], 'asc');

    markWeekDirty(sourceWeekId);
    markWeekDirty(targetWeekId);

    set({
      weeks: state.weeks.map((w) => {
        if (w.id === sourceWeekId) {
          return { ...w, updatedAt: new Date().toISOString(), bullets: updatedSourceBullets };
        }
        if (w.id === targetWeekId) {
          return { ...w, updatedAt: new Date().toISOString(), bullets: updatedTargetBullets };
        }
        return w;
      }),
    });

    schedulePersistence(get);
    get().showToast(`Moved entry to "${targetWeek.weekTitle}"`);
  },

  mergeWeekInto: (sourceWeekId, targetWeekId) => {
    if (get().previewGuest != null) return;
    const state = get();
    const sourceWeek = state.weeks.find((w) => w.id === sourceWeekId);
    const targetWeek = state.weeks.find((w) => w.id === targetWeekId);
    if (!sourceWeek || !targetWeek) return;

    const activeSourceBullets = (sourceWeek.bullets || []).filter((b) => !b.deletedAt);
    const combinedBullets = sortBulletsByDate(
      [...(targetWeek.bullets || []), ...activeSourceBullets],
      'asc'
    );

    const deletedAt = new Date().toISOString();

    markWeekDirty(sourceWeekId);
    markWeekDirty(targetWeekId);

    set({
      weeks: state.weeks.map((w) => {
        if (w.id === sourceWeekId) {
          return {
            ...w,
            bullets: [],
            deletedAt,
            updatedAt: deletedAt,
          };
        }
        if (w.id === targetWeekId) {
          return {
            ...w,
            bullets: combinedBullets,
            updatedAt: new Date().toISOString(),
          };
        }
        return w;
      }),
      activeWeekId: targetWeekId,
      viewMode: 'weekly',
    });

    schedulePersistence(get);
    get().showToast(`Merged "${sourceWeek.weekTitle}" into "${targetWeek.weekTitle}"`);
  },

  restoreItem: (type, id, parentId) => {
    if (get().previewGuest != null) return;
    if (type === 'week') {
      const week = get().weeks.find((w) => w.id === id);
      if (!week) return;
      markWeekDirty(id);
      set((state) => ({
        weeks: state.weeks.map((w) => (w.id === id ? { ...w, deletedAt: undefined } : w)),
      }));
      schedulePersistence(get);
      get().showToast(`Restored "${week.weekTitle}"`);
    } else if (type === 'entry') {
      const weekId = parentId;
      if (!weekId) return;
      markWeekDirty(weekId);
      set((state) => ({
        weeks: state.weeks.map((w) => {
          if (w.id !== weekId) return w;
          return {
            ...w,
            updatedAt: new Date().toISOString(),
            bullets: w.bullets.map((b) => (b.id === id ? { ...b, deletedAt: undefined } : b)),
          };
        }),
      }));
      schedulePersistence(get);
      get().showToast('Restored journal entry');
    } else if (type === 'folder') {
      const folder = get().coreCategories.find((c) => c.id === id);
      if (!folder) return;
      markFolderDirty(id);
      set((state) => ({
        coreCategories: state.coreCategories.map((c) => (c.id === id ? { ...c, deletedAt: undefined } : c)),
      }));
      schedulePersistence(get);
      get().showToast(`Restored folder "${folder.title}"`);
    } else if (type === 'note') {
      const note = get().coreItems.find((i) => i.id === id);
      if (!note) return;
      markCoreItemDirty(id);
      set((state) => ({
        coreItems: state.coreItems.map((i) => (i.id === id ? { ...i, deletedAt: undefined } : i)),
      }));
      schedulePersistence(get);
      get().showToast(`Restored note "${note.title || 'Note'}"`);
    }
  },

  permanentlyDeleteItem: async (type, id, parentId) => {
    if (get().previewGuest != null) return;
    if (type === 'week') {
      markWeekDeleted(id);
      set((state) => ({
        weeks: state.weeks.filter((w) => w.id !== id),
      }));
      schedulePersistence(get);
      get().showToast('Permanently deleted week');
    } else if (type === 'entry') {
      const weekId = parentId;
      if (!weekId) return;
      markWeekDirty(weekId);
      set((state) => ({
        weeks: state.weeks.map((w) => {
          if (w.id !== weekId) return w;
          return {
            ...w,
            updatedAt: new Date().toISOString(),
            bullets: w.bullets.filter((b) => b.id !== id),
          };
        }),
      }));
      schedulePersistence(get);
      get().showToast('Permanently deleted journal entry');
    } else if (type === 'folder') {
      markFolderDeleted(id);
      set((state) => ({
        coreCategories: state.coreCategories.filter((c) => c.id !== id),
        coreItems: state.coreItems.filter((i) => i.categoryId !== id),
      }));
      schedulePersistence(get);
      get().showToast('Permanently deleted folder');
    } else if (type === 'note') {
      markCoreItemDeleted(id);
      set((state) => ({
        coreItems: state.coreItems.filter((i) => i.id !== id),
      }));
      schedulePersistence(get);
      get().showToast('Permanently deleted note');
    }
  },

  purgeOldDeletedItems: () => {
    if (get().previewGuest != null) return;
    const s = get();
    if (s.currentUser?.role !== 'owner') return;

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const isOlderThan30Days = (iso?: string) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return !isNaN(t) && now - t > THIRTY_DAYS_MS;
    };

    let hasPurged = false;

    // 1. Purge weeks
    const survivingWeeks: WeeklyBlock[] = [];
    for (const week of s.weeks) {
      if (week.deletedAt && isOlderThan30Days(week.deletedAt)) {
        markWeekDeleted(week.id);
        hasPurged = true;
      } else {
        let weekBulletsChanged = false;
        const survivingBullets = (week.bullets || []).filter((b) => {
          if (b.deletedAt && isOlderThan30Days(b.deletedAt)) {
            weekBulletsChanged = true;
            hasPurged = true;
            return false;
          }
          return true;
        });

        if (weekBulletsChanged) {
          markWeekDirty(week.id);
          survivingWeeks.push({
            ...week,
            bullets: survivingBullets,
          });
        } else {
          survivingWeeks.push(week);
        }
      }
    }

    // 2. Purge folders
    const survivingFolders: CoreCategoryConfig[] = [];
    for (const folder of s.coreCategories) {
      if (folder.deletedAt && isOlderThan30Days(folder.deletedAt)) {
        markFolderDeleted(folder.id);
        hasPurged = true;
      } else {
        survivingFolders.push(folder);
      }
    }

    // 3. Purge notes
    const survivingNotes: CoreTopicItem[] = [];
    for (const note of s.coreItems) {
      if (note.deletedAt && isOlderThan30Days(note.deletedAt)) {
        markCoreItemDeleted(note.id);
        hasPurged = true;
      } else {
        survivingNotes.push(note);
      }
    }

    if (hasPurged) {
      set({
        weeks: survivingWeeks,
        coreCategories: survivingFolders,
        coreItems: survivingNotes,
      });
      schedulePersistence(get);
      console.log('[Auto-Purge] Cleaned up soft-deleted items older than 30 days');
    }
  },

  reorderWeeks: (weeks) => {
    if (get().previewGuest != null) return;
    for (const w of weeks) {
      markWeekDirty(w.id);
    }
    set({ weeks });
    for (const w of weeks) {
      saveWeekDoc(w).catch(() => {});
    }
    schedulePersistence(get);
  },

  updateBulletTimestamp: (weekId, bulletId, newTimestamp, newIsoDate, isCustom = true) => {
    if (get().previewGuest != null) return;
    markWeekDirty(weekId);
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
        const updatedWeek = {
          ...sourceWeek,
          updatedAt: new Date().toISOString(),
          bullets: sortedBullets,
        };
        const nextWeeks = state.weeks.map((w) => (w.id === weekId ? updatedWeek : w));
        saveWeekDoc(updatedWeek).catch((err) =>
          console.error('[Firestore CRITICAL ERROR] Failed to save timestamp updated week:', err)
        );
        return { weeks: nextWeeks };
      }

      const { updatedWeeks, targetWeekId } = relocateBulletToMatchingWeek(
        updatedBullet,
        weekId,
        state.weeks
      );

      if (targetWeekId) {
        markWeekDirty(targetWeekId);
      }

      const newSourceWeek = updatedWeeks.find((w) => w.id === weekId);
      const newTargetWeek = updatedWeeks.find((w) => w.id === targetWeekId);
      if (newSourceWeek) saveWeekDoc(newSourceWeek).catch(() => {});
      if (newTargetWeek && newTargetWeek.id !== weekId) saveWeekDoc(newTargetWeek).catch(() => {});

      return {
        weeks: updatedWeeks,
        activeWeekId: targetWeekId || state.activeWeekId,
      };
    });

    schedulePersistence(get);
  },

  updateEntryTimestamp: async (entryId: string, isoTimestamp: string) => {
    if (get().previewGuest != null) return;
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
          markCoreItemDirty(entryId);
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

      markWeekDirty(targetWeekId);
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
        const updatedWeek = {
          ...sourceWeek,
          updatedAt: new Date().toISOString(),
          bullets: sortedBullets,
        };
        const nextWeeks = state.weeks.map((w) => (w.id === targetWeekId ? updatedWeek : w));
        saveWeekDoc(updatedWeek).catch(() => {});
        return { weeks: nextWeeks };
      }

      const { updatedWeeks, targetWeekId: newWeekId } = relocateBulletToMatchingWeek(
        updatedBullet,
        targetWeekId,
        state.weeks
      );

      if (newWeekId) {
        markWeekDirty(newWeekId);
      }

      const newSourceWeek = updatedWeeks.find((w) => w.id === targetWeekId);
      const newTargetWeek = updatedWeeks.find((w) => w.id === newWeekId);
      if (newSourceWeek) saveWeekDoc(newSourceWeek).catch(() => {});
      if (newTargetWeek && newTargetWeek.id !== targetWeekId) saveWeekDoc(newTargetWeek).catch(() => {});

      return {
        weeks: updatedWeeks,
        activeWeekId: newWeekId || state.activeWeekId,
      };
    });

    schedulePersistence(get);
  },

  updateWeeklyEntryTimestamp: async (weekId: string, newTimestamp: string, newIsoDate?: string) => {
    if (get().previewGuest != null) return;
    markWeekDirty(weekId);
    const dateObj = parseDateFromTimestamp(newIsoDate || newTimestamp);
    if (isNaN(dateObj.getTime())) return;
    const isoString = dateObj.toISOString();
    const formattedTimestamp = formatTimestamp(dateObj);
    const { weekTitle: newWeekTitle, startDate: newStartDate, endDate: newEndDate } =
      getWeekTitleAndRangeForDate(dateObj);

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

      saveWeekDoc(updatedWeek).catch(() => {});

      return {
        weeks: sortedWeeks,
        activeWeekId: weekId,
      };
    });

    schedulePersistence(get);
  },

  setActiveWeekId: (id) => {
    if (hasDirtyItems()) {
      get().flushAutoSave();
    }
    set({ activeWeekId: id });
  },

  // Core Topic Item Operations
  setCoreItems: (itemsOrUpdater) => {
    if (get().previewGuest != null) return;
    set((state) => {
      const nextItems = typeof itemsOrUpdater === 'function' ? itemsOrUpdater(state.coreItems) : itemsOrUpdater;
      for (const ni of nextItems) {
        const prev = state.coreItems.find((i) => i.id === ni.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(ni)) {
          markCoreItemDirty(ni.id);
        }
      }
      return { coreItems: nextItems };
    });
    schedulePersistence(get);
  },

  addCoreItem: (item) => {
    if (get().previewGuest != null) return;
    markCoreItemDirty(item.id);
    set((state) => ({
      coreItems: [item, ...state.coreItems],
    }));
    saveCoreTopicDoc(item).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to save core item:', err)
    );
    schedulePersistence(get);
  },

  updateCoreItem: (item) => {
    if (get().previewGuest != null) return;
    markCoreItemDirty(item.id);
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
    if (get().previewGuest != null) return;
    const item = get().coreItems.find((i) => i.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    markCoreItemDirty(id);
    set((state) => ({
      coreItems: state.coreItems.map((i) => (i.id === id ? { ...i, deletedAt } : i)),
    }));
    schedulePersistence(get);
    get().showToast(`Moved note "${item.title || 'Note'}" to Recently Deleted`);
  },

  toggleCompleteCoreItem: (item) => {
    if (get().previewGuest != null) return;
    markCoreItemDirty(item.id);
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
    if (get().previewGuest != null) return;
    markCoreItemDirty(item.id);
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
    if (hasDirtyItems()) {
      get().flushAutoSave();
    }
    set({ activeCoreCategory: catId, activeCoreSubCategory: undefined });
  },

  setActiveCoreSubCategory: (subCatId) => {
    if (hasDirtyItems()) {
      get().flushAutoSave();
    }
    set({ activeCoreSubCategory: subCatId });
  },

  // Folder / Category Operations
  setCoreCategories: (catsOrUpdater) => {
    if (get().previewGuest != null) return;
    set((state) => {
      const nextCats = typeof catsOrUpdater === 'function' ? catsOrUpdater(state.coreCategories) : catsOrUpdater;
      for (const nc of nextCats) {
        const prev = state.coreCategories.find((c) => c.id === nc.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(nc)) {
          markFolderDirty(nc.id);
        }
      }
      return { coreCategories: nextCats };
    });
    schedulePersistence(get);
  },

  addCoreCategory: (newCat) => {
    if (get().previewGuest != null) return;
    markFolderDirty(newCat.id);
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
    if (get().previewGuest != null) return;
    markFolderDirty(catId);
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
    if (get().previewGuest != null) return;
    const cat = get().coreCategories.find((c) => c.id === catId);
    if (!cat) return;
    const deletedAt = new Date().toISOString();
    markFolderDirty(catId);
    set((state) => {
      const updatedCats = state.coreCategories.map((c) => (c.id === catId ? { ...c, deletedAt } : c));
      const remaining = updatedCats.filter((c) => !c.deletedAt);
      let nextActiveCat = state.activeCoreCategory;
      if (state.activeCoreCategory === catId) {
        nextActiveCat = remaining[0]?.id || 'what-to-text-her';
      }
      return {
        coreCategories: updatedCats,
        activeCoreCategory: nextActiveCat,
      };
    });
    schedulePersistence(get);
    get().showToast(`Moved folder "${cat.title}" to Recently Deleted`);
  },

  reorderCoreCategories: (cats) => {
    if (get().previewGuest != null) return;
    for (const c of cats) {
      markFolderDirty(c.id);
    }
    set({ coreCategories: cats });
    for (const c of cats) {
      saveFolderDoc(c).catch(() => {});
    }
    saveCoreCategoriesDoc(cats).catch(() => {});
    schedulePersistence(get);
  },

  setPinnedCategoryIds: (ids) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    set({ pinnedCategoryIds: ids });
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
        pinnedCategoryIds: ids,
        filters: s.filters,
        comments: s.comments,
      });
    } catch {}
    saveAppStateDoc({ pinnedCategoryIds: ids }).catch((err) => {
      console.warn('[Firestore] Failed to save pinnedCategoryIds:', err);
    });
  },

  togglePinCategory: (categoryId) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    let updated: string[] = [];
    set((state) => {
      const isPinned = state.pinnedCategoryIds.includes(categoryId);
      updated = isPinned
        ? state.pinnedCategoryIds.filter((id) => id !== categoryId)
        : [...state.pinnedCategoryIds, categoryId];
      return { pinnedCategoryIds: updated };
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
        pinnedCategoryIds: updated,
        filters: s.filters,
        comments: s.comments,
      });
    } catch {}
    saveAppStateDoc({ pinnedCategoryIds: updated }).catch((err) => {
      console.warn('[Firestore] Failed to save pinnedCategoryIds:', err);
    });
  },

  reorderPinnedCategories: (ids) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    set({ pinnedCategoryIds: ids });
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
        pinnedCategoryIds: ids,
        filters: s.filters,
        comments: s.comments,
      });
    } catch {}
    saveAppStateDoc({ pinnedCategoryIds: ids }).catch((err) => {
      console.warn('[Firestore] Failed to save pinnedCategoryIds:', err);
    });
  },

  setIntroQuotes: async (quotes) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    set({ introQuotes: quotes });
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
        introQuotes: quotes,
        filters: s.filters,
        comments: s.comments,
      });
    } catch {}
    await saveAppStateDoc({ introQuotes: quotes });
  },

  addIntroQuote: async (quote) => {
    if (get().previewGuest != null) return;
    const trimmed = quote.trim();
    if (!trimmed) return;
    markAppStateDirty();
    const current = get().introQuotes || [];
    const updated = [...current, trimmed];
    set({ introQuotes: updated });
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
        introQuotes: updated,
        filters: s.filters,
        comments: s.comments,
      });
    } catch {}
    await saveAppStateDoc({ introQuotes: updated });
  },

  removeIntroQuote: async (index) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    const current = get().introQuotes || [];
    const updated = current.filter((_, i) => i !== index);
    set({ introQuotes: updated });
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
        introQuotes: updated,
        filters: s.filters,
        comments: s.comments,
      });
    } catch {}
    await saveAppStateDoc({ introQuotes: updated });
  },

  addSubCategory: (categoryId, subCategory) => {
    if (get().previewGuest != null) return;
    markFolderDirty(categoryId);
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
    if (get().previewGuest != null) return;
    markFolderDirty(categoryId);
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
    if (get().previewGuest != null) return;
    markFolderDirty(categoryId);
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
    if (get().previewGuest != null) return;
    markFolderDirty(categoryId);
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
    if (get().previewGuest != null) return;
    markCoreItemDirty(itemId);
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
    if (hasDirtyItems()) {
      get().flushAutoSave();
    }
    set({ viewMode });
  },

  // Comment Operations
  setComments: (commentsOrUpdater) => {
    if (get().previewGuest != null) return;
    set((state) => {
      const nextComments = typeof commentsOrUpdater === 'function' ? commentsOrUpdater(state.comments) : commentsOrUpdater;
      return { comments: nextComments };
    });
    schedulePersistence(get);
  },

  addComment: (commentData) => {
    if (get().previewGuest != null) return;
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
    if (get().previewGuest != null) return;
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
    if (get().previewGuest != null) return;
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
    }));
    deleteCommentDoc(id).catch((err) =>
      console.error('[Firestore CRITICAL ERROR] Failed to delete comment:', err)
    );
    schedulePersistence(get);
  },

  editComment: (id, newContent) => {
    if (get().previewGuest != null) return;
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
    if (get().previewGuest != null) return;
    set((state) => {
      const isCurrentlyPinned = Boolean(bullet.pinnedToLearned);
      const newPinnedState = !isCurrentlyPinned;

      const updatedBullet = { ...bullet, pinnedToLearned: newPinnedState };
      markWeekDirty(week.id);
      let targetWeek: WeeklyBlock | undefined;
      const updatedWeeks = state.weeks.map((w) => {
        if (w.id !== week.id) return w;
        const wUp = {
          ...w,
          updatedAt: new Date().toISOString(),
          bullets: w.bullets.map((b) => (b.id === bullet.id ? updatedBullet : b)),
        };
        targetWeek = wUp;
        return wUp;
      });

      if (targetWeek) {
        saveWeekDoc(targetWeek).catch(() => {});
      }

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
        markCoreItemDirty(newItem.id);
        if (existingIndex >= 0) {
          updatedCoreItems[existingIndex] = newItem;
        } else {
          updatedCoreItems = [newItem, ...updatedCoreItems];
        }
        saveCoreTopicDoc(newItem).catch(() => {});
      } else {
        const found = updatedCoreItems.find((item) => item.pinnedBulletId === bullet.id);
        if (found) {
          markCoreItemDeleted(found.id);
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
  setIsQuotesModalOpen: (isQuotesModalOpen) => set({ isQuotesModalOpen }),
  setIsCommentsSidebarOpen: (isCommentsSidebarOpen) => set({ isCommentsSidebarOpen }),
  setActiveCommentSectionTag: (activeCommentSectionTag) => set({ activeCommentSectionTag }),
  setIsOpenMobile: (isOpenMobile) => set({ isOpenMobile }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
  setIsEditorOpen: (isEditorOpen) => set({ isEditorOpen }),
  toggleEditor: () => set((state) => ({ isEditorOpen: !state.isEditorOpen })),

  // Session Prep Handlers
  setIsSessionPrepOpen: (isSessionPrepOpen) => set({ isSessionPrepOpen }),
  setNextSessionAt: (nextSessionAt) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    set({ nextSessionAt });
    schedulePersistence(get);
  },
  setSessionPrepNotes: (sessionPrepNotes) => {
    if (get().previewGuest != null) return;
    markAppStateDirty();
    set({ sessionPrepNotes });
    schedulePersistence(get);
  },
  toggleEntryForSession: (weekId, bulletId) => {
    if (get().previewGuest != null) return;
    markWeekDirty(weekId);
    set((state) => ({
      weeks: state.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          bullets: (w.bullets || []).map((b) => {
            if (b.id !== bulletId) return b;
            return {
              ...b,
              forSession: !b.forSession,
            };
          }),
        };
      }),
    }));
    schedulePersistence(get);
  },
  setEntryDiscussed: (weekId, bulletId, discussed) => {
    if (get().previewGuest != null) return;
    markWeekDirty(weekId);
    set((state) => ({
      weeks: state.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          bullets: (w.bullets || []).map((b) => {
            if (b.id !== bulletId) return b;
            return {
              ...b,
              discussedAt: discussed ? new Date().toISOString() : null,
            };
          }),
        };
      }),
    }));
    schedulePersistence(get);
  },

  // Auth / Permissions
  setCurrentUser: (userOrUpdater) => {
    set((state) => ({
      currentUser: typeof userOrUpdater === 'function' ? userOrUpdater(state.currentUser) : userOrUpdater,
    }));
    // Run once per session only after write-gate has opened (weeks, folders, and core_topics snapshots applied), owner-only
    const s = get();
    if (
      !hasPurgedThisSession &&
      s.currentUser?.role === 'owner' &&
      (s.hasReceivedFirstFirestoreSnapshot || getHasReceivedFirstFirestoreSnapshot())
    ) {
      hasPurgedThisSession = true;
      s.purgeOldDeletedItems();
    }
  },

  setPermissions: (permissions) => set({ permissions }),
 
  logout: async () => {
    hasPurgedThisSession = false;
    await logoutUser();
    setGlobalFirestoreSnapshotReceived(false);
    clearDirtyTracking();
    set({
      hasReceivedFirstFirestoreSnapshot: false,
      isHydrated: false,
      currentUser: {
        uid: '',
        email: '',
        displayName: '',
        isLoggedIn: false,
        role: 'unauthorized',
      },
    });
  },

  syncFromCloud: (cloudData: Partial<AppState> & { clientSessionId?: string; updatedAt?: string; isInitialHydrationComplete?: boolean }) => {
    const state = get();

    const incomingWeeks = cloudData.weeks && Array.isArray(cloudData.weeks) ? cloudData.weeks : state.weeks;
    const incomingCoreItems = cloudData.coreItems && Array.isArray(cloudData.coreItems) ? cloudData.coreItems : state.coreItems;
    const incomingCoreCategories = cloudData.coreCategories && Array.isArray(cloudData.coreCategories) ? cloudData.coreCategories : state.coreCategories;
    const incomingPinnedCategoryIds = cloudData.pinnedCategoryIds && Array.isArray(cloudData.pinnedCategoryIds) ? cloudData.pinnedCategoryIds : state.pinnedCategoryIds;
    const incomingIntroQuotes = cloudData.introQuotes !== undefined && Array.isArray(cloudData.introQuotes) ? cloudData.introQuotes : state.introQuotes;
    const incomingComments = cloudData.comments && Array.isArray(cloudData.comments) ? cloudData.comments : state.comments;
    const incomingNextSessionAt = cloudData.nextSessionAt !== undefined ? cloudData.nextSessionAt : state.nextSessionAt;
    const incomingSessionPrepNotes = cloudData.sessionPrepNotes !== undefined ? cloudData.sessionPrepNotes : state.sessionPrepNotes;

    const isWeeksEqual = incomingWeeks.length === state.weeks.length && JSON.stringify(incomingWeeks) === JSON.stringify(state.weeks);
    const isCoreItemsEqual = incomingCoreItems.length === state.coreItems.length && JSON.stringify(incomingCoreItems) === JSON.stringify(state.coreItems);
    const isCategoriesEqual = incomingCoreCategories.length === state.coreCategories.length && JSON.stringify(incomingCoreCategories) === JSON.stringify(state.coreCategories);
    const isPinnedEqual = incomingPinnedCategoryIds.length === state.pinnedCategoryIds.length && JSON.stringify(incomingPinnedCategoryIds) === JSON.stringify(state.pinnedCategoryIds);
    const isQuotesEqual = (incomingIntroQuotes?.length || 0) === (state.introQuotes?.length || 0) && JSON.stringify(incomingIntroQuotes) === JSON.stringify(state.introQuotes);
    const isCommentsEqual = (incomingComments?.length || 0) === (state.comments?.length || 0) && JSON.stringify(incomingComments) === JSON.stringify(state.comments);
    const isNextSessionEqual = incomingNextSessionAt === state.nextSessionAt;
    const isPrepNotesEqual = incomingSessionPrepNotes === state.sessionPrepNotes;

    // The write-gate opens only after the weeks, folders, and core_topics snapshots have each been received AND applied to the store.
    const shouldOpenWriteGate = Boolean(cloudData.isInitialHydrationComplete) && !state.hasReceivedFirstFirestoreSnapshot;

    if (isWeeksEqual && isCoreItemsEqual && isCategoriesEqual && isPinnedEqual && isQuotesEqual && isCommentsEqual && isNextSessionEqual && isPrepNotesEqual && !shouldOpenWriteGate) {
      return;
    }

    set((currentState) => {
      const nextWeeks = incomingWeeks;
      const nextCoreCategories = incomingCoreCategories;
      const nextCoreItems = incomingCoreItems;

      const hasActiveWeek = nextWeeks.some((w) => w.id === currentState.activeWeekId);
      const activeWeekId = hasActiveWeek
        ? currentState.activeWeekId
        : currentState.activeWeekId || nextWeeks[0]?.id || '';

      const hasActiveCat = nextCoreCategories.some((c) => c.id === currentState.activeCoreCategory);
      const activeCoreCategory = hasActiveCat
        ? currentState.activeCoreCategory
        : currentState.activeCoreCategory || nextCoreCategories[0]?.id || '';

      return {
        isHydrated: currentState.isHydrated || shouldOpenWriteGate,
        hasReceivedFirstFirestoreSnapshot: currentState.hasReceivedFirstFirestoreSnapshot || shouldOpenWriteGate,
        weeks: nextWeeks,
        coreItems: nextCoreItems,
        coreCategories: nextCoreCategories,
        pinnedCategoryIds: incomingPinnedCategoryIds,
        introQuotes: incomingIntroQuotes,
        nextSessionAt: incomingNextSessionAt,
        sessionPrepNotes: incomingSessionPrepNotes,
        comments: incomingComments,
        activeWeekId,
        activeCoreCategory,
      };
    });

    if (shouldOpenWriteGate) {
      setGlobalFirestoreSnapshotReceived(true);
      clearDirtyTracking();
      console.log('[Write-Gate] All required snapshots (weeks, folders, core_topics) received and applied. Write-gate opened.');

      // Run once per session only after write-gate has opened (weeks, folders, and core_topics snapshots applied), owner-only
      if (!hasPurgedThisSession && get().currentUser?.role === 'owner') {
        hasPurgedThisSession = true;
        get().purgeOldDeletedItems();
      }
    }

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
        introQuotes: s.introQuotes,
        nextSessionAt: s.nextSessionAt,
        sessionPrepNotes: s.sessionPrepNotes,
        filters: s.filters,
        comments: s.comments,
      });
    } catch (err) {
      console.warn('Sync cache update note:', err);
    }
  },

  resetAllData: () => {
    if (get().previewGuest != null) return;
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
  useJournalStore((s) => s.weeks.find((w) => w.id === s.activeWeekId) || s.weeks[0]);
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
export const useLastCloudSavedAt = () => useJournalStore((s) => s.lastCloudSavedAt);
export const useIsRecentlyDeletedOpen = () => useJournalStore((s) => s.isRecentlyDeletedOpen);
export const useIsSidebarOpen = () => useJournalStore((s) => s.isSidebarOpen);
export const useIsOpenMobile = () => useJournalStore((s) => s.isOpenMobile);
export const useIsFullScreen = () => useJournalStore((s) => s.isFullScreen);
export const useIsEditorOpen = () => useJournalStore((s) => s.isEditorOpen);
export const useIsExportModalOpen = () => useJournalStore((s) => s.isExportModalOpen);
export const useIsAccessManagementOpen = () => useJournalStore((s) => s.isAccessManagementOpen);
export const useIsQuotesModalOpen = () => useJournalStore((s) => s.isQuotesModalOpen);
export const useIntroQuotes = () => useJournalStore((s) => s.introQuotes);
export const useIsCommentsSidebarOpen = () => useJournalStore((s) => s.isCommentsSidebarOpen);
export const useActiveCommentSectionTag = () => useJournalStore((s) => s.activeCommentSectionTag);
export const useUpdateWeeklyEntryTimestamp = () => useJournalStore((s) => s.updateWeeklyEntryTimestamp);
export const useIsHydrated = () => useJournalStore((s) => s.isHydrated);
export const useHasReceivedFirstFirestoreSnapshot = () => useJournalStore((s) => s.hasReceivedFirstFirestoreSnapshot);
export const useCreateFolder = () => useJournalStore((s) => s.createFolder);
export const useSaveEntry = () => useJournalStore((s) => s.saveEntry);
export const useTogglePinWeek = () => useJournalStore((s) => s.togglePinWeek);
export const useUpdateWeek = () => useJournalStore((s) => s.updateWeek);
export const useNextSessionAt = () => useJournalStore((s) => s.nextSessionAt);
export const useSessionPrepNotes = () => useJournalStore((s) => s.sessionPrepNotes);
export const useIsSessionPrepOpen = () => useJournalStore((s) => s.isSessionPrepOpen);
export const useSetNextSessionAt = () => useJournalStore((s) => s.setNextSessionAt);
export const useSetSessionPrepNotes = () => useJournalStore((s) => s.setSessionPrepNotes);
export const useToggleEntryForSession = () => useJournalStore((s) => s.toggleEntryForSession);
export const useSetEntryDiscussed = () => useJournalStore((s) => s.setEntryDiscussed);
export const usePreviewGuest = () => useJournalStore((s) => s.previewGuest);
export const useSetPreviewGuest = () => useJournalStore((s) => s.setPreviewGuest);
