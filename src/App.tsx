import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Calendar, Film, FolderOpen, Home, Menu, PanelLeftOpen, Maximize2, Minimize2, Eye } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { CoreTopicsView } from './components/CoreSections/CoreTopicsView';
import { EntranceOverlay } from './components/EntranceOverlay';
import { HomeDashboard } from './components/HomeDashboard';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WeeklyTimeline } from './components/WeeklyJournal/WeeklyTimeline';
import { SharedMediaHub } from './components/MediaHub/SharedMediaHub';
import { LoginScreen } from './components/Auth/LoginScreen';
import { AccessRestrictedScreen } from './components/AccessRestrictedScreen';
import { ConfirmDeleteProvider } from './components/ConfirmDeleteModal';
import { RecentlyDeletedModal } from './components/RecentlyDeletedModal';
import { Toast } from './components/Toast';
import { NextSessionCard } from './components/SessionPrep/NextSessionCard';
import { SessionPrepModal } from './components/SessionPrep/SessionPrepModal';
import { WhoCanSeeThisCard } from './components/WhoCanSeeThisCard';
import { AccentTheme, CoreCategoryId, FilterOptions, ViewMode, WeeklyBlock, CoreTopicItem, BulletPoint, CoreCategoryConfig, CommentItem } from './types';
import { ACCENT_THEMES } from './utils/theme';
import { navigateToComment } from './utils/commentNavigation';
import {
  useJournalStore,
  useWeeks,
  useActiveWeekId,
  useCoreItems,
  useActiveCoreCategory,
  useCoreCategories,
  usePinnedCategoryIds,
  useFilters,
  useTheme,
  useAccentTheme,
  useComments,
  useViewMode,
  useCurrentUser,
  usePermissions,
  useIsSidebarOpen,
  useIsOpenMobile,
  useIsFullScreen,
  useIsEditorOpen,
  usePreviewGuest,
  useSetPreviewGuest,
} from './store/useJournalStore';
import {
  subscribePermissions,
  subscribeJournalData,
  onAuthStateChangedWrapper,
  resolveUserRole,
  refreshFirestoreSync,
  subscribePresence,
  UserRole,
} from './lib/firebase';
import { canUserViewItem } from './hooks/usePermissions';

// Lazy-loaded heavy modals and slide-overs for minimal initial bundle & fast TTI
const ExportShareModal = lazy(() =>
  import('./components/ExportShareModal').then((m) => ({ default: m.ExportShareModal }))
);
const AccessManagementModal = lazy(() =>
  import('./components/AccessManagementModal').then((m) => ({ default: m.AccessManagementModal }))
);
const IntroQuotesModal = lazy(() =>
  import('./components/IntroQuotesModal').then((m) => ({ default: m.IntroQuotesModal }))
);
const CommentsSidebar = lazy(() =>
  import('./components/CommentsSidebar').then((m) => ({ default: m.CommentsSidebar }))
);
const SharedView = lazy(() =>
  import('./components/SharedView').then((m) => ({ default: m.SharedView }))
);

export default function App() {
  const [isPending, startTransition] = useTransition();

  // Atomic selectors from Zustand store
  const weeks = useWeeks();
  const activeWeekId = useActiveWeekId();
  const coreItems = useCoreItems();
  const activeCoreCategory = useActiveCoreCategory();
  const coreCategories = useCoreCategories();
  const pinnedCategoryIds = usePinnedCategoryIds();
  const filters = useFilters();
  const theme = useTheme();
  const accentTheme = useAccentTheme();
  const comments = useComments();
  const viewMode = useViewMode();
  const currentUser = useCurrentUser();
  const permissions = usePermissions();
  const isSidebarOpen = useIsSidebarOpen();
  const isOpenMobile = useIsOpenMobile();
  const isFullScreen = useIsFullScreen();
  const isEditorOpen = useIsEditorOpen();
  const previewGuest = usePreviewGuest();
  const setPreviewGuest = useSetPreviewGuest();
  const [presenceMap, setPresenceMap] = useState<Record<string, { lastViewedAt: string }>>({});

  // Real-time presence listener for the owner only
  useEffect(() => {
    if (!currentUser?.isLoggedIn || currentUser?.role !== 'owner') {
      return;
    }
    const unsubscribe = subscribePresence((map) => {
      setPresenceMap(map);
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser?.isLoggedIn, currentUser?.role]);

  // Safe guest preview: applies guest role & email for client-side filtering only.
  // Does not alter authenticated user, write permissions, or Firestore rules access.
  const effectiveUser = useMemo(() => {
    if (!previewGuest) return currentUser;
    return {
      ...currentUser,
      email: previewGuest.email,
      role: previewGuest.role,
      displayName: previewGuest.email,
    };
  }, [currentUser, previewGuest]);

  // Client-side visibility filtering enforced against user's email:
  // - Owner sees everything, always.
  // - Other users see an item IF visibleToEmails is empty/absent OR user's email is included.
  const visibleCoreCategories = useMemo(() => {
    return coreCategories.filter((cat) => !cat.deletedAt && canUserViewItem(cat.visibleToEmails, effectiveUser));
  }, [coreCategories, effectiveUser]);

  const visibleCoreItems = useMemo(() => {
    const visibleCategoryIds = new Set(visibleCoreCategories.map((c) => c.id));
    return coreItems.filter((item) => {
      if (item.deletedAt) return false;
      if (!visibleCategoryIds.has(item.categoryId)) return false;
      return canUserViewItem(item.visibleToEmails, effectiveUser);
    });
  }, [coreItems, visibleCoreCategories, effectiveUser]);

  // Non-deleted weeks with non-deleted journal entries for active views
  const activeWeeks = useMemo(() => {
    return weeks
      .filter((w) => !w.deletedAt)
      .map((w) => ({
        ...w,
        bullets: (w.bullets || []).filter(
          (b) => !b.deletedAt && canUserViewItem(b.visibleToEmails, effectiveUser)
        ),
      }));
  }, [weeks, effectiveUser]);

  const {
    isExportModalOpen,
    isAccessManagementOpen,
    isQuotesModalOpen,
    isRecentlyDeletedOpen,
    isCommentsSidebarOpen,
    activeCommentSectionTag,
    nextSessionAt,
    sessionPrepNotes,
    isSessionPrepOpen,
    setIsSessionPrepOpen,
    setNextSessionAt,
    setSessionPrepNotes,
    setEntryDiscussed,
    setWeeks,
    addWeek,
    reorderWeeks,
    setActiveWeekId,
    setCoreItems,
    addCoreCategory,
    updateCoreCategory,
    deleteCoreCategory,
    reorderCoreCategories,
    setActiveCoreCategory,
    setTheme,
    setAccentTheme,
    setFilters,
    setViewMode,
    addComment,
    resolveComment,
    deleteComment,
    editComment,
    togglePinTakeaway,
    setPinnedCategoryIds,
    togglePinCategory,
    setIsExportModalOpen,
    setIsAccessManagementOpen,
    setIsQuotesModalOpen,
    setIsRecentlyDeletedOpen,
    setIsCommentsSidebarOpen,
    setActiveCommentSectionTag,
    setIsOpenMobile,
    toggleSidebar,
    toggleFullScreen,
    toggleEditor,
    setIsSidebarOpen,
    setIsFullScreen,
    setIsEditorOpen,
    setCurrentUser,
    setPermissions,
    logout,
    syncFromCloud,
  } = useJournalStore(
    useShallow((s) => ({
      isExportModalOpen: s.isExportModalOpen,
      isAccessManagementOpen: s.isAccessManagementOpen,
      isQuotesModalOpen: s.isQuotesModalOpen,
      isRecentlyDeletedOpen: s.isRecentlyDeletedOpen,
      isCommentsSidebarOpen: s.isCommentsSidebarOpen,
      activeCommentSectionTag: s.activeCommentSectionTag,
      nextSessionAt: s.nextSessionAt,
      sessionPrepNotes: s.sessionPrepNotes,
      isSessionPrepOpen: s.isSessionPrepOpen,
      setIsSessionPrepOpen: s.setIsSessionPrepOpen,
      setNextSessionAt: s.setNextSessionAt,
      setSessionPrepNotes: s.setSessionPrepNotes,
      setEntryDiscussed: s.setEntryDiscussed,
      setWeeks: s.setWeeks,
      addWeek: s.addWeek,
      reorderWeeks: s.reorderWeeks,
      setActiveWeekId: s.setActiveWeekId,
      setCoreItems: s.setCoreItems,
      addCoreCategory: s.addCoreCategory,
      updateCoreCategory: s.updateCoreCategory,
      deleteCoreCategory: s.deleteCoreCategory,
      reorderCoreCategories: s.reorderCoreCategories,
      setActiveCoreCategory: s.setActiveCoreCategory,
      setTheme: s.setTheme,
      setAccentTheme: s.setAccentTheme,
      setFilters: s.setFilters,
      setViewMode: s.setViewMode,
      addComment: s.addComment,
      resolveComment: s.resolveComment,
      deleteComment: s.deleteComment,
      editComment: s.editComment,
      togglePinTakeaway: s.togglePinTakeaway,
      setPinnedCategoryIds: s.setPinnedCategoryIds,
      togglePinCategory: s.togglePinCategory,
      setIsExportModalOpen: s.setIsExportModalOpen,
      setIsAccessManagementOpen: s.setIsAccessManagementOpen,
      setIsQuotesModalOpen: s.setIsQuotesModalOpen,
      setIsRecentlyDeletedOpen: s.setIsRecentlyDeletedOpen,
      setIsCommentsSidebarOpen: s.setIsCommentsSidebarOpen,
      setActiveCommentSectionTag: s.setActiveCommentSectionTag,
      setIsOpenMobile: s.setIsOpenMobile,
      toggleSidebar: s.toggleSidebar,
      toggleFullScreen: s.toggleFullScreen,
      toggleEditor: s.toggleEditor,
      setIsSidebarOpen: s.setIsSidebarOpen,
      setIsFullScreen: s.setIsFullScreen,
      setIsEditorOpen: s.setIsEditorOpen,
      setCurrentUser: s.setCurrentUser,
      setPermissions: s.setPermissions,
      logout: s.logout,
      syncFromCloud: s.syncFromCloud,
    }))
  );

  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  // Transitions for fluid UI navigation
  const handleSetViewMode = useCallback(
    (mode: React.SetStateAction<ViewMode>) => {
      startTransition(() => {
        if (typeof mode === 'function') {
          setViewMode(mode(viewMode));
        } else {
          setViewMode(mode);
        }
      });
    },
    [setViewMode, viewMode]
  );

  const handleSetActiveWeekId = useCallback(
    (id: React.SetStateAction<string>) => {
      startTransition(() => {
        if (typeof id === 'function') {
          setActiveWeekId(id(activeWeekId));
        } else {
          setActiveWeekId(id);
        }
      });
    },
    [setActiveWeekId, activeWeekId]
  );

  const handleSetActiveCoreCategory = useCallback(
    (cat: React.SetStateAction<CoreCategoryId>) => {
      startTransition(() => {
        if (typeof cat === 'function') {
          setActiveCoreCategory(cat(activeCoreCategory));
        } else {
          setActiveCoreCategory(cat);
        }
      });
    },
    [setActiveCoreCategory, activeCoreCategory]
  );

  const handleSetFilters = useCallback(
    (action: React.SetStateAction<FilterOptions>) => {
      startTransition(() => {
        setFilters(action);
      });
    },
    [setFilters]
  );

  const handleSetAccentTheme = useCallback(
    (themeChoice: React.SetStateAction<AccentTheme>) => {
      startTransition(() => {
        if (typeof themeChoice === 'function') {
          setAccentTheme(themeChoice(accentTheme));
        } else {
          setAccentTheme(themeChoice);
        }
      });
    },
    [setAccentTheme, accentTheme]
  );

  // Real-time Firestore permissions subscription with clean unsubscribe
  useEffect(() => {
    if (!currentUser?.isLoggedIn) {
      return;
    }

    const unsubscribe = subscribePermissions((updatedPerms) => {
      setPermissions(updatedPerms);
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser?.isLoggedIn, setPermissions]);

  // Tab Visibility Listener: immediate flush when hidden / pagehide, read-only refresh on visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        useJournalStore.getState().flushAutoSave();
      } else if (document.visibilityState === 'visible') {
        // Read-only refresh without tearing down or recreating active Firestore subscriptions
        refreshFirestoreSync();
      }
    };

    const handlePageHide = () => {
      useJournalStore.getState().flushAutoSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Auth listener with clean unsubscribe
  useEffect(() => {
    const unsubscribe = onAuthStateChangedWrapper((user) => {
      if (user) {
        const userEmail = (user.email || '').trim().toLowerCase();
        const resolvedRole = resolveUserRole(userEmail, permissions) || 'unauthorized';

        setCurrentUser({
          uid: user.uid,
          email: userEmail || 'user@example.com',
          displayName: user.displayName || userEmail.split('@')[0] || 'User',
          photoURL: user.photoURL || undefined,
          isLoggedIn: true,
          role: resolvedRole,
          isSimulated: false,
        });
      } else {
        setCurrentUser({
          uid: '',
          email: '',
          displayName: '',
          isLoggedIn: false,
          role: 'unauthorized',
          isSimulated: false,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [permissions, setCurrentUser]);

  // Live Cloud data subscription with clean unsubscribe (only when authenticated and authorized)
  useEffect(() => {
    if (!currentUser?.isLoggedIn || currentUser?.role === 'unauthorized') {
      return;
    }

    const unsubscribe = subscribeJournalData(
      (cloudData) => {
        startTransition(() => {
          syncFromCloud(cloudData);
        });
      }
    );
    return () => {
      unsubscribe();
    };
  }, [currentUser?.isLoggedIn, currentUser?.role, syncFromCloud]);

  // Global Keyboard Shortcuts (Ctrl+B/Cmd+B for Sidebar toggle, Escape for Fullscreen exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !isInput) {
        e.preventDefault();
        toggleSidebar();
      }

      if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault();
        toggleFullScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleFullScreen, isFullScreen]);

  // Apply dark mode class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Modal open/close handlers
  const handleOpenExportModal = useCallback(() => setIsExportModalOpen(true), [setIsExportModalOpen]);
  const handleCloseExportModal = useCallback(() => setIsExportModalOpen(false), [setIsExportModalOpen]);
  const handleOpenAccessManagement = useCallback(() => setIsAccessManagementOpen(true), [setIsAccessManagementOpen]);
  const handleCloseAccessManagement = useCallback(() => setIsAccessManagementOpen(false), [setIsAccessManagementOpen]);
  const handleOpenQuotesModal = useCallback(() => setIsQuotesModalOpen(true), [setIsQuotesModalOpen]);
  const handleCloseQuotesModal = useCallback(() => setIsQuotesModalOpen(false), [setIsQuotesModalOpen]);

  const [activeCommentItemId, setActiveCommentItemId] = React.useState<string | undefined>();
  const [activeCommentTargetType, setActiveCommentTargetType] = React.useState<'weekly' | 'core' | undefined>();
  const [activeCommentTargetId, setActiveCommentTargetId] = React.useState<string | undefined>();

  const handleOpenCommentSection = useCallback(
    (sectionTag?: string, itemId?: string, targetType?: 'weekly' | 'core', targetId?: string) => {
      setActiveCommentSectionTag(sectionTag);
      setActiveCommentItemId(itemId);
      setActiveCommentTargetType(targetType);
      setActiveCommentTargetId(targetId);
      setIsCommentsSidebarOpen(true);
    },
    [setActiveCommentSectionTag, setIsCommentsSidebarOpen]
  );

  const handleNavigateToComment = useCallback(
    (comment: CommentItem) => {
      navigateToComment(comment, {
        onNavigateView: (mode) => handleSetViewMode(mode),
        onSelectWeek: (wId) => handleSetActiveWeekId(wId),
        onSelectCoreCategory: (cId) => handleSetActiveCoreCategory(cId),
        onSelectSectionTag: (tag) => setActiveCommentSectionTag(tag),
        setHighlightedItemId: (itemId) => setActiveCommentItemId(itemId || undefined),
      });
    },
    [handleSetViewMode, handleSetActiveWeekId, handleSetActiveCoreCategory, setActiveCommentSectionTag]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Ensure active category is valid and permitted for current user
  useEffect(() => {
    if (
      visibleCoreCategories.length > 0 &&
      !visibleCoreCategories.some((c) => c.id === activeCoreCategory)
    ) {
      handleSetActiveCoreCategory(visibleCoreCategories[0].id);
    }
  }, [visibleCoreCategories, activeCoreCategory, handleSetActiveCoreCategory]);

  // Check URL params for shareId
  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('shareId');

  if (shareId) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-neutral-500">Loading Shared Journal...</div>}>
        <SharedView
          shareId={shareId}
          onExitSharedView={() => {
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
          }}
        />
      </Suspense>
    );
  }

  // Security gate: unauthorized users cannot see any journal data without authenticating
  if (!currentUser?.isLoggedIn) {
    return (
      <LoginScreen
        permissions={permissions}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        accentTheme={accentTheme}
      />
    );
  }

  // Unauthorized Fallback Screen for logged-in accounts without permission
  if (currentUser.role === 'unauthorized') {
    return (
      <AccessRestrictedScreen
        currentUser={currentUser}
        permissions={permissions}
        onLogout={logout}
      />
    );
  }

  const currentWeekTitle = (activeWeeks.find((w) => w.id === activeWeekId) || weeks.find((w) => w.id === activeWeekId))?.weekTitle || 'Weekly Journal';
  const currentCategoryTitle = visibleCoreCategories.find((c) => c.id === activeCoreCategory)?.title || 'Core Topic';

  return (
    <ConfirmDeleteProvider>
      <div
        className="w-full h-full min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f8f9fa] dark:bg-[#0f0f11] text-neutral-900 dark:text-neutral-100 font-sans antialiased flex flex-col"
      >
        {/* Preview Mode Sticky Banner (Read-only safe view) */}
        {previewGuest && (
          <div className="shrink-0 z-50 w-full bg-amber-500 text-stone-950 px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <Eye className="w-4 h-4 shrink-0 text-stone-950" />
              <span>Previewing as {previewGuest.email} — read-only</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewGuest(null)}
              className="px-3 py-1 bg-stone-950 hover:bg-stone-850 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              Exit
            </button>
          </div>
        )}

        {/* Top Navigation Bar with Dynamic Safe Area */}
        <Navbar
          viewMode={viewMode}
          setViewMode={handleSetViewMode}
          theme={theme}
          setTheme={setTheme}
          accentTheme={accentTheme}
          setAccentTheme={handleSetAccentTheme}
          filters={filters}
          setFilters={handleSetFilters}
          onOpenExportModal={handleOpenExportModal}
          onOpenAccessManagement={handleOpenAccessManagement}
          onOpenQuotesModal={handleOpenQuotesModal}
          onOpenSessionPrep={() => setIsSessionPrepOpen(true)}
          onLogout={logout}
          currentUser={effectiveUser}
          totalCoreCount={visibleCoreCategories.length}
          weeks={activeWeeks}
          coreItems={visibleCoreItems}
          coreCategories={visibleCoreCategories}
          onNavigateToWeek={(wId) => {
            handleSetActiveWeekId(wId);
            handleSetViewMode('weekly');
          }}
          onNavigateToCoreCategory={(cId) => {
            handleSetActiveCoreCategory(cId);
            handleSetViewMode('core');
          }}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          onToggleMobileDrawer={() => setIsOpenMobile(!isOpenMobile)}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
        />

        {/* Dynamic Edge-to-Edge Workspace Layout */}
        <div
          className={`flex-1 w-full flex items-start overflow-hidden transition-all duration-300 ease-in-out ${
            isCommentsSidebarOpen ? 'lg:pr-96 xl:pr-96' : ''
          }`}
        >
          {/* Collapsible Sidebar / Mobile Drawer Navigation */}
          <Sidebar
            viewMode={viewMode}
            setViewMode={handleSetViewMode}
            weeks={weeks}
            activeWeekId={activeWeekId}
            setActiveWeekId={handleSetActiveWeekId}
            coreCategories={visibleCoreCategories}
            activeCoreCategory={activeCoreCategory}
            setActiveCoreCategory={handleSetActiveCoreCategory}
            onAddWeek={addWeek}
            onAddCoreCategory={addCoreCategory}
            onUpdateCoreCategory={updateCoreCategory}
            onDeleteCoreCategory={deleteCoreCategory}
            onReorderWeeks={reorderWeeks}
            onReorderCoreCategories={reorderCoreCategories}
            accentTheme={accentTheme}
            isOpenMobile={isOpenMobile}
            setIsOpenMobile={setIsOpenMobile}
            currentUser={effectiveUser}
            filters={filters}
            coreItems={visibleCoreItems}
            pinnedCategoryIds={pinnedCategoryIds}
            onTogglePinCategory={togglePinCategory}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
          />

          {/* Floating Expand Sidebar Pill button when sidebar is collapsed on desktop */}
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              title="Expand Sidebar (Ctrl+B / ⌘B)"
              className={`hidden md:flex fixed left-3 top-20 z-20 min-h-[44px] px-3.5 py-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-md text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all items-center gap-2 text-xs font-bold animate-in fade-in zoom-in-95 duration-150`}
            >
              <PanelLeftOpen className={`w-4 h-4 ${currentAccent.textPrimary}`} />
              <span>Sidebar</span>
            </button>
          )}

          {/* Primary View Canvas: Fluid, Responsive & Scrollable */}
          <main
            className={`flex-1 h-full min-w-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8 ${
              isFullScreen
                ? 'p-3 sm:p-6 md:p-8 lg:p-12'
                : 'p-3 sm:p-5 md:p-6 lg:p-8'
            } ${isPending ? 'opacity-70' : 'opacity-100'}`}
          >
            {viewMode === 'home' ? (
              <HomeDashboard
                weeks={activeWeeks}
                coreItems={visibleCoreItems}
                coreCategories={visibleCoreCategories}
                pinnedCategoryIds={pinnedCategoryIds}
                accentTheme={accentTheme}
                onNavigateToWeek={(wId) => {
                  handleSetActiveWeekId(wId);
                  handleSetViewMode('weekly');
                }}
                onNavigateToCoreCategory={(cId) => {
                  handleSetActiveCoreCategory(cId);
                  handleSetViewMode('core');
                }}
                onNavigateToView={(mode) => {
                  handleSetViewMode(mode);
                }}
                onAddNewWeek={() => {
                  handleSetViewMode('weekly');
                }}
                onUpdatePinnedCategoryIds={setPinnedCategoryIds}
                onTogglePinCategory={togglePinCategory}
              />
            ) : viewMode === 'weekly' ? (
              <WeeklyTimeline
                weeks={activeWeeks}
                setWeeks={setWeeks}
                activeWeekId={activeWeekId}
                setActiveWeekId={handleSetActiveWeekId}
                filters={filters}
                setFilters={handleSetFilters}
                accentTheme={accentTheme}
                currentUser={effectiveUser}
                comments={comments}
                onOpenCommentSection={handleOpenCommentSection}
                activeCommentSectionTag={activeCommentSectionTag}
                onTogglePinTakeaway={togglePinTakeaway}
              />
            ) : viewMode === 'core' ? (
              <CoreTopicsView
                items={visibleCoreItems}
                setItems={setCoreItems}
                coreCategories={visibleCoreCategories}
                activeCategory={activeCoreCategory}
                setActiveCategory={handleSetActiveCoreCategory}
                onAddCoreCategory={addCoreCategory}
                onUpdateCoreCategory={updateCoreCategory}
                onDeleteCoreCategory={deleteCoreCategory}
                accentTheme={accentTheme}
                filters={filters}
                setFilters={handleSetFilters}
                currentUser={effectiveUser}
                pinnedCategoryIds={pinnedCategoryIds}
                onTogglePinCategory={togglePinCategory}
                comments={comments}
                onOpenCommentSection={handleOpenCommentSection}
                activeCommentSectionTag={activeCommentSectionTag}
                onNavigateToWeek={(wId) => {
                  handleSetActiveWeekId(wId);
                  handleSetViewMode('weekly');
                }}
              />
            ) : (
              <SharedMediaHub
                weeks={activeWeeks}
                coreItems={visibleCoreItems}
                currentUser={effectiveUser}
                onUpdateWeeks={setWeeks}
                onUpdateCoreItems={setCoreItems}
                accentTheme={accentTheme}
                onNavigateToWeek={(wId) => {
                  handleSetActiveWeekId(wId);
                  handleSetViewMode('weekly');
                }}
                onNavigateToCoreCategory={(cId) => {
                  handleSetActiveCoreCategory(cId as CoreCategoryId);
                  handleSetViewMode('core');
                }}
              />
            )}
          </main>

          {/* Right-Side Panel on Wide Screens */}
          <aside className="hidden xl:flex flex-col w-80 2xl:w-84 h-full border-l border-stone-200/80 dark:border-white/10 bg-[#FAFAF9]/60 dark:bg-[#121214]/60 backdrop-blur-md overflow-y-auto shrink-0 p-4 space-y-4">
            <NextSessionCard
              weeks={weeks}
              nextSessionAt={nextSessionAt}
              onSetNextSessionAt={setNextSessionAt}
              onOpenSessionPrep={() => setIsSessionPrepOpen(true)}
              onToggleDiscussed={setEntryDiscussed}
              isOwner={currentUser?.role === 'owner' && !previewGuest}
              accentTheme={accentTheme}
            />

            {/* Who can see this (Owner only in right-side panel) */}
            {currentUser?.role === 'owner' && (
              <WhoCanSeeThisCard
                permissions={permissions}
                presenceMap={presenceMap}
                previewGuest={previewGuest}
                onStartPreview={(email, role) => setPreviewGuest({ email, role })}
                onExitPreview={() => setPreviewGuest(null)}
                onOpenAccessManagement={handleOpenAccessManagement}
                accentTheme={accentTheme}
              />
            )}
          </aside>
        </div>

        {/* Authentic iOS Bottom Tab Bar (Only on mobile < md) */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#F2F2F7] dark:bg-[#000000] border-t border-black/5 dark:border-white/10 pb-[env(safe-area-inset-bottom,0px)] flex items-center justify-around h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] px-1 shadow-lg"
        >
          <button
            onClick={() => handleSetViewMode('home')}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all ${
              viewMode === 'home' ? 'font-bold' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
            style={{ color: viewMode === 'home' ? currentAccent.colorHex : undefined }}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          <button
            onClick={() => handleSetViewMode('weekly')}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all ${
              viewMode === 'weekly' ? 'font-bold' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
            style={{ color: viewMode === 'weekly' ? currentAccent.colorHex : undefined }}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Weekly</span>
          </button>

          <button
            onClick={() => handleSetViewMode('core')}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all ${
              viewMode === 'core' ? 'font-bold' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
            style={{ color: viewMode === 'core' ? currentAccent.colorHex : undefined }}
          >
            <FolderOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Topics</span>
          </button>

          <button
            onClick={() => handleSetViewMode('media')}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all ${
              viewMode === 'media' ? 'font-bold' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
            style={{ color: viewMode === 'media' ? currentAccent.colorHex : undefined }}
          >
            <Film className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Media</span>
          </button>

          <button
            onClick={() => setIsOpenMobile(true)}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-all"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Folders</span>
          </button>
        </nav>

        {/* Google Docs Style Comments & Feedback Sidebar (Suspense Loaded) */}
        <Suspense fallback={null}>
          <CommentsSidebar
            isOpen={isCommentsSidebarOpen}
            onToggleOpen={() => setIsCommentsSidebarOpen(!isCommentsSidebarOpen)}
            comments={comments}
            onAddComment={addComment}
            onResolveComment={resolveComment}
            onDeleteComment={deleteComment}
            onEditComment={editComment}
            onNavigateToComment={handleNavigateToComment}
            targetType={activeCommentTargetType || (viewMode === 'weekly' ? 'weekly' : 'core')}
            targetId={activeCommentTargetId || (viewMode === 'weekly' ? activeWeekId : activeCoreCategory)}
            activeItemId={activeCommentItemId}
            targetTitle={viewMode === 'weekly' ? currentWeekTitle : currentCategoryTitle}
            currentUser={currentUser}
            activeSectionTag={activeCommentSectionTag}
            onSelectActiveSectionTag={(tag) => setActiveCommentSectionTag(tag)}
            onClearActiveSectionTag={() => {
              setActiveCommentSectionTag(undefined);
              setActiveCommentItemId(undefined);
              setActiveCommentTargetType(undefined);
              setActiveCommentTargetId(undefined);
            }}
            accentTheme={accentTheme}
          />
        </Suspense>

        {/* Export & Share Modal (Suspense Loaded) */}
        {isExportModalOpen && (
          <Suspense fallback={null}>
            <ExportShareModal
              weeks={weeks}
              coreItems={visibleCoreItems}
              coreCategories={visibleCoreCategories}
              onClose={handleCloseExportModal}
            />
          </Suspense>
        )}

        {/* Access Management & Permissions Modal (Suspense Loaded) */}
        {isAccessManagementOpen && (
          <Suspense fallback={null}>
            <AccessManagementModal
              isOpen={isAccessManagementOpen}
              onClose={handleCloseAccessManagement}
              permissions={permissions}
              currentUser={currentUser}
              presenceMap={presenceMap}
              onStartPreview={(email, role) => setPreviewGuest({ email, role })}
            />
          </Suspense>
        )}

        {/* Intro Screen Quotes Management Modal (Suspense Loaded) */}
        {isQuotesModalOpen && (
          <Suspense fallback={null}>
            <IntroQuotesModal
              isOpen={isQuotesModalOpen}
              onClose={handleCloseQuotesModal}
            />
          </Suspense>
        )}

        {/* Recently Deleted Modal */}
        <RecentlyDeletedModal
          isOpen={isRecentlyDeletedOpen}
          onClose={() => setIsRecentlyDeletedOpen(false)}
        />

        {/* Session Prep Popup Modal */}
        <SessionPrepModal
          isOpen={isSessionPrepOpen}
          onClose={() => setIsSessionPrepOpen(false)}
          weeks={weeks}
          nextSessionAt={nextSessionAt}
          onSetNextSessionAt={setNextSessionAt}
          sessionPrepNotes={sessionPrepNotes}
          onSetSessionPrepNotes={setSessionPrepNotes}
          onToggleDiscussed={setEntryDiscussed}
          isOwner={currentUser?.role === 'owner'}
          accentTheme={accentTheme}
        />

        {/* Global Toast Notification */}
        <Toast />

        {/* Minimalist Cinematic Entrance & Typewriter Intro Screen */}
        <EntranceOverlay />
      </div>
    </ConfirmDeleteProvider>
  );
}
