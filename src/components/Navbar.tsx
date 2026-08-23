import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Folder,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Share2,
  Shield,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CurrentUserProfile } from '../lib/firebase';
import { useJournalStore } from '../store/useJournalStore';
import {
  AccentTheme,
  CoreCategoryConfig,
  CoreCategoryId,
  CoreTopicItem,
  FilterOptions,
  ViewMode,
  WeeklyBlock,
} from '../types';
import { ACCENT_THEMES } from '../utils/theme';

interface NavbarProps {
  viewMode?: ViewMode;
  setViewMode?: (mode: ViewMode) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentTheme: AccentTheme;
  setAccentTheme: (theme: AccentTheme) => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onOpenExportModal: () => void;
  onOpenAccessManagement: () => void;
  onLogout?: () => void;
  currentUser: CurrentUserProfile;
  totalCoreCount?: number;
  weeks?: WeeklyBlock[];
  coreItems?: CoreTopicItem[];
  coreCategories?: CoreCategoryConfig[];
  onNavigateToWeek?: (weekId: string) => void;
  onNavigateToCoreCategory?: (catId: CoreCategoryId) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onToggleMobileDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  viewMode,
  setViewMode,
  theme,
  setTheme,
  accentTheme,
  setAccentTheme,
  filters,
  setFilters,
  onOpenExportModal,
  onOpenAccessManagement,
  onLogout,
  currentUser,
  weeks = [],
  coreItems = [],
  coreCategories = [],
  onNavigateToWeek,
  onNavigateToCoreCategory,
  isSidebarOpen = true,
  onToggleSidebar,
  isFullScreen = false,
  onToggleFullScreen,
  onToggleMobileDrawer,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState(filters.searchQuery || '');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  const saveStatus = useJournalStore((s) => s.saveStatus);
  const lastSavedAt = useJournalStore((s) => s.lastSavedAt);
  const flushAutoSave = useJournalStore((s) => s.flushAutoSave);

  useEffect(() => {
    if (filters.searchQuery === '' && searchInputValue !== '') {
      setSearchInputValue('');
      setTotalMatches(0);
      setActiveMatchIndex(0);
    }
  }, [filters.searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.searchQuery === searchInputValue) return prev;
        return { ...prev, searchQuery: searchInputValue };
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [searchInputValue, setFilters]);

  const syncActiveMatch = useCallback((index: number, marksList?: HTMLElement[]) => {
    const marks = marksList || Array.from(document.querySelectorAll<HTMLElement>('mark[data-search-match="true"]'));
    if (marks.length === 0) {
      setTotalMatches(0);
      setActiveMatchIndex(0);
      return;
    }

    setTotalMatches(marks.length);
    const targetIdx = Math.max(0, Math.min(index, marks.length - 1));
    setActiveMatchIndex(targetIdx);

    marks.forEach((m, i) => {
      if (i === targetIdx) {
        m.setAttribute('data-active-match', 'true');
        m.classList.add('search-mark-active');
      } else {
        m.removeAttribute('data-active-match');
        m.classList.remove('search-mark-active');
      }
    });

    const targetEl = marks[targetIdx];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleNextMatch = useCallback(() => {
    const marks = Array.from(document.querySelectorAll<HTMLElement>('mark[data-search-match="true"]'));
    if (marks.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % marks.length;
    syncActiveMatch(nextIdx, marks);
  }, [activeMatchIndex, syncActiveMatch]);

  const handlePrevMatch = useCallback(() => {
    const marks = Array.from(document.querySelectorAll<HTMLElement>('mark[data-search-match="true"]'));
    if (marks.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + marks.length) % marks.length;
    syncActiveMatch(prevIdx, marks);
  }, [activeMatchIndex, syncActiveMatch]);

  const handleClearSearch = useCallback(() => {
    setSearchInputValue('');
    setFilters((prev) => ({ ...prev, searchQuery: '' }));
    setIsSearchDropdownOpen(false);
    setTotalMatches(0);
    setActiveMatchIndex(0);
  }, [setFilters]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick search results
  const searchResults = useMemo(() => {
    if (!searchInputValue.trim()) {
      return { matchingWeeks: [], matchingCoreItems: [], totalCount: 0 };
    }
    const q = searchInputValue.toLowerCase();

    const matchingWeeks: { week: WeeklyBlock; matchSnippet: string }[] = [];
    weeks.forEach((w) => {
      if (w.weekTitle.toLowerCase().includes(q)) {
        matchingWeeks.push({ week: w, matchSnippet: w.weekTitle });
      }
    });

    const matchingCoreItems: { item: CoreTopicItem; categoryTitle: string }[] = [];
    coreItems.forEach((item) => {
      if (item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q)) {
        const cat = coreCategories.find((c) => c.id === item.categoryId);
        matchingCoreItems.push({
          item,
          categoryTitle: cat?.title || 'Topic',
        });
      }
    });

    return {
      matchingWeeks: matchingWeeks.slice(0, 4),
      matchingCoreItems: matchingCoreItems.slice(0, 5),
      totalCount: matchingWeeks.length + matchingCoreItems.length,
    };
  }, [searchInputValue, weeks, coreItems, coreCategories]);

  const userInitial = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();

  return (
    <header className="shrink-0 w-full relative z-30 border-b border-black/5 dark:border-white/10 bg-[#F2F2F7] dark:bg-[#000000] transition-colors">
      <div className="w-full px-2.5 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left: Desktop Toggle / Mobile Menu Trigger & App Title */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Desktop Sidebar Toggle */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
              className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Drawer Trigger */}
          {onToggleMobileDrawer && (
            <button
              type="button"
              onClick={onToggleMobileDrawer}
              title="Open Navigation"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewMode?.('home')}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity focus:outline-none"
            title="Go to Home Overview"
          >
            <div
              className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
              style={{ backgroundColor: currentAccent.colorHex }}
            >
              J
            </div>
            <span className="hidden sm:inline text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Journal
            </span>
          </button>

          <div className="flex items-center gap-2">
            {/* Subtle Visual Sync Indicator */}
            <button
              type="button"
              onClick={() => {
                if (saveStatus === 'unsaved') {
                  flushAutoSave();
                }
              }}
              title={
                saveStatus === 'saving'
                  ? 'Saving changes safely in background...'
                  : saveStatus === 'unsaved'
                  ? 'Unsaved changes (saving in background, click to save immediately)'
                  : lastSavedAt
                  ? `All changes saved (${lastSavedAt})`
                  : 'All changes saved'
              }
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all select-none hover:bg-black/5 dark:hover:bg-white/10"
            >
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span className="hidden sm:inline text-[10px]">Saving...</span>
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="hidden sm:inline text-[10px]">Unsaved</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline text-[10px]">Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="hidden sm:inline text-[10px]">Local backup</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Center: Apple-style Translucent Pill Search Bar */}
        <div className="relative flex-1 max-w-md mx-1 sm:mx-2" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-stone-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchInputValue}
              onChange={(e) => {
                setSearchInputValue(e.target.value);
                if (!isSearchDropdownOpen) setIsSearchDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchInputValue.trim()) setIsSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleClearSearch();
                  searchInputRef.current?.blur();
                }
              }}
              className="w-full pl-8 pr-14 sm:pr-16 py-2 text-base sm:text-xs bg-black/5 dark:bg-white/10 hover:bg-black/[0.07] dark:hover:bg-white/[0.14] focus:bg-white dark:focus:bg-[#1C1C1E] border border-transparent focus:border-black/10 dark:focus:border-white/15 rounded-full text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none transition-all min-h-[38px]"
            />

            {/* In-Search Controls */}
            {searchInputValue ? (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {totalMatches > 0 && (
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono mr-1">
                    {activeMatchIndex + 1}/{totalMatches}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={totalMatches === 0}
                  className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={totalMatches === 0}
                  className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="hidden sm:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 dark:text-stone-500 font-mono pointer-events-none">
                ⌘K
              </span>
            )}
          </div>

          {/* Quick Search Popover */}
          {isSearchDropdownOpen && searchInputValue.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-100 max-h-[70vh] flex flex-col p-2 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-stone-400">
                {searchResults.totalCount === 0
                  ? 'No results'
                  : `${searchResults.totalCount} result${searchResults.totalCount === 1 ? '' : 's'}`}
              </div>

              {searchResults.matchingWeeks.map(({ week }) => (
                <button
                  key={week.id}
                  onClick={() => {
                    onNavigateToWeek?.(week.id);
                    setViewMode?.('weekly');
                    setIsSearchDropdownOpen(false);
                  }}
                  className="w-full text-left p-2.5 min-h-[44px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                    {week.weekTitle}
                  </span>
                </button>
              ))}

              {searchResults.matchingCoreItems.map(({ item, categoryTitle }) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateToCoreCategory?.(item.categoryId);
                    setViewMode?.('core');
                    setIsSearchDropdownOpen(false);
                  }}
                  className="w-full text-left p-2.5 min-h-[44px] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 truncate shrink-0">
                    {categoryTitle}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Desktop Controls (md:flex) */}
        <div className="hidden md:flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Access / Permissions Button */}
          <button
            onClick={onOpenAccessManagement}
            title="Access & Sharing"
            className="min-h-[44px] min-w-[44px] p-2 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Theme & Palette Button */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen((prev) => !prev)}
              title="Appearance"
              className="min-h-[44px] min-w-[44px] p-2 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            {isThemeMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsThemeMenuOpen(false)} />
                <div
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl shadow-xl p-3 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-1 bg-neutral-200/50 dark:bg-white/5 rounded-xl">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        theme === 'light'
                          ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        theme === 'dark'
                          ? 'bg-[#18181b] text-neutral-100 shadow-xs border border-white/10'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Dark</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5">
                    <span className="block text-[11px] font-semibold text-stone-400 mb-2">
                      Accent Color
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(Object.keys(ACCENT_THEMES) as AccentTheme[]).map((key) => {
                        const t = ACCENT_THEMES[key];
                        const isSelected = accentTheme === key;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setAccentTheme(key);
                              setIsThemeMenuOpen(false);
                            }}
                            title={t.name}
                            className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto transition-transform ${
                              isSelected ? 'ring-2 ring-offset-2 ring-black/20 dark:ring-white/30 scale-105' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: t.colorHex }}
                          >
                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsThemeMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('replay-intro'));
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Replay Intro Quote</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Full-Screen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              className="min-h-[44px] min-w-[44px] p-2 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Export & Share */}
          <button
            onClick={onOpenExportModal}
            title="Export & Share"
            className="min-h-[44px] min-w-[44px] p-2 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Streamlined User Avatar */}
          <button
            onClick={onOpenAccessManagement}
            title={`Signed in as ${currentUser.email} (${currentUser.role})`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-black/10 dark:hover:ring-white/20 transition-all">
              {userInitial}
            </div>
          </button>

          {/* Sign Out (if provided) */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="min-h-[44px] min-w-[44px] p-2 rounded-full text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Mobile Condensed Menu Trigger (md:hidden) */}
        <div className="relative flex md:hidden items-center shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`min-h-[44px] min-w-[44px] p-2 rounded-full flex items-center justify-center transition-colors ${
              isMobileMenuOpen
                ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Options Menu"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Mobile Dropdown Menu: Anchored directly below the 3 dots in the top right, strictly within the app frame */}
          {isMobileMenuOpen && (
            <>
              {/* Dismiss backdrop */}
              <div
                className="fixed inset-0 z-40 bg-[#0f0f11]/90 transform-gpu will-change-transform isolate"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/15 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100dvh-4.5rem)] overflow-y-auto space-y-3 transform-gpu will-change-transform isolate"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with User and Close button */}
                <div className="flex items-center justify-between pb-2.5 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center text-xs font-bold shrink-0">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-[10px] text-stone-400 capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[36px] min-w-[36px] p-1.5 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Cloud & Local Sync Status Banner (Mobile) */}
                <div className="flex items-center justify-between px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-stone-400" />
                    <span className="font-medium text-stone-700 dark:text-stone-300">Sync Status</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (saveStatus === 'unsaved') flushAutoSave();
                    }}
                    className="flex items-center gap-1.5 font-medium"
                  >
                    {saveStatus === 'saving' && (
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    )}
                    {saveStatus === 'unsaved' && (
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Save Now</span>
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>{lastSavedAt ? `Saved (${lastSavedAt})` : 'Saved'}</span>
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Local backup</span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Appearance / Theme Options */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Appearance</span>
                  <div className="flex bg-neutral-200/50 dark:bg-white/10 p-1 rounded-xl">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 ${
                        theme === 'light'
                          ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 ${
                        theme === 'dark'
                          ? 'bg-[#18181b] text-neutral-100 shadow-xs border border-white/10'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-amber-400" />
                      <span>Dark</span>
                    </button>
                  </div>

                  {/* Accent Color picker */}
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {(Object.keys(ACCENT_THEMES) as AccentTheme[]).map((key) => {
                      const t = ACCENT_THEMES[key];
                      const isSelected = accentTheme === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setAccentTheme(key)}
                          className={`min-h-[36px] py-1 px-1.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold text-white transition-all ${
                            isSelected ? 'ring-2 ring-offset-2 ring-black/20 dark:ring-white/30 font-bold' : 'opacity-85'
                          }`}
                          style={{ backgroundColor: t.colorHex }}
                        >
                          {isSelected && <span>✓</span>}
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation & Action Links */}
                <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/10">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAccessManagement();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#2C2C2E] flex items-center justify-between text-xs font-semibold text-stone-900 dark:text-stone-100 shadow-2xs active:bg-stone-100 dark:active:bg-stone-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span>Access & Sharing</span>
                    </div>
                    <span className="text-stone-400 text-xs">›</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenExportModal();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#2C2C2E] flex items-center justify-between text-xs font-semibold text-stone-900 dark:text-stone-100 shadow-2xs active:bg-stone-100 dark:active:bg-stone-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Share2 className="w-4 h-4 text-purple-500" />
                      <span>Export & Share</span>
                    </div>
                    <span className="text-stone-400 text-xs">›</span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-between text-xs font-bold shadow-2xs active:bg-rose-100 dark:active:bg-rose-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </div>
                      <span className="text-rose-400 text-xs">›</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
});
