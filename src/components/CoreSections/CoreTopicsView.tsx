import {
  Activity,
  BookOpenCheck,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileDown,
  FileText,
  Folder,
  FolderOpen,
  Heart,
  HeartHandshake,
  HelpCircle,
  History,
  LayoutGrid,
  List,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Utensils,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import {
  AccentTheme,
  CommentItem,
  CoreCategoryConfig,
  CoreCategoryId,
  CoreTopicItem,
  FilterOptions,
  ItemActivityStatus,
} from '../../types';
import { exportCoreCategoryToPDF } from '../../utils/pdfExport';
import { ACCENT_THEMES } from '../../utils/theme';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { HighlightText } from '../HighlightText';
import { AddCoreCategoryModal } from './AddCoreCategoryModal';
import { BulletedNoteEditor } from './BulletedNoteEditor';
import { DeepQuestionsView } from './DeepQuestionsView';
import { EditCoreCategoryModal } from './EditCoreCategoryModal';
import { TopicCategoryCard } from './TopicCategoryCard';
import { TopicItemModal } from './TopicItemModal';

// Map icon name string to Lucide icon component
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Folder: Folder,
  MessageSquareText: MessageSquareText,
  HeartHandshake: HeartHandshake,
  Heart: Heart,
  HelpCircle: HelpCircle,
  BookOpenCheck: BookOpenCheck,
  Sparkles: Sparkles,
  Compass: Compass,
  Utensils: Utensils,
  ShoppingBag: ShoppingBag,
  MessageCircle: MessageCircle,
  History: History,
  ShieldAlert: ShieldAlert,
  UserCheck: UserCheck,
  Activity: Activity,
};

interface CoreTopicsViewProps {
  items: CoreTopicItem[];
  setItems: React.Dispatch<React.SetStateAction<CoreTopicItem[]>>;
  coreCategories: CoreCategoryConfig[];
  activeCategory: CoreCategoryId;
  setActiveCategory: (cat: CoreCategoryId) => void;
  onAddCoreCategory: (newCat: CoreCategoryConfig) => void;
  onUpdateCoreCategory?: (catId: string, updated: Partial<CoreCategoryConfig>) => void;
  onDeleteCoreCategory: (catId: string) => void;
  accentTheme: AccentTheme;
  filters: FilterOptions;
  currentUser: CurrentUserProfile;
  pinnedCategoryIds?: string[];
  onTogglePinCategory?: (categoryId: string) => void;
  comments?: CommentItem[];
  onOpenCommentSection?: (sectionTag: string) => void;
  activeCommentSectionTag?: string;
  onNavigateToWeek?: (weekId: string) => void;
}

export const CoreTopicsView: React.FC<CoreTopicsViewProps> = React.memo(({
  items,
  setItems,
  coreCategories,
  activeCategory,
  setActiveCategory,
  onAddCoreCategory,
  onUpdateCoreCategory,
  onDeleteCoreCategory,
  accentTheme,
  filters,
  currentUser,
  pinnedCategoryIds = [],
  onTogglePinCategory,
  comments = [],
  onOpenCommentSection,
  activeCommentSectionTag,
  onNavigateToWeek,
}) => {
  const isOwner = currentUser.role === 'owner';
  const canEdit = currentUser.role === 'owner' || currentUser.role === 'editor';
  const isViewer = currentUser.role === 'viewer';

  const [questionsLayoutMode, setQuestionsLayoutMode] = useState<'cards' | 'qa_dashboard'>('cards');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [watchlistStatusFilter, setWatchlistStatusFilter] = useState<'All' | ItemActivityStatus>('All');

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CoreTopicItem | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);

  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  const activeIndex = useMemo(() => {
    const idx = coreCategories.findIndex((c) => c.id === activeCategory);
    return idx >= 0 ? idx : 0;
  }, [coreCategories, activeCategory]);

  const activeCategoryConfig = coreCategories[activeIndex] || coreCategories[0];
  const prevCategory = activeIndex > 0 ? coreCategories[activeIndex - 1] : null;
  const nextCategory = activeIndex < coreCategories.length - 1 ? coreCategories[activeIndex + 1] : null;

  // Active Category Bullet Notes Auto-Save State
  const [notesValue, setNotesValue] = useState(activeCategoryConfig?.notes || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNotesValue(activeCategoryConfig?.notes || '');
    setSaveStatus('idle');
  }, [activeCategoryConfig?.id, activeCategoryConfig?.notes]);

  const handleNotesChange = useCallback(
    (newNotes: string) => {
      setNotesValue(newNotes);
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saving');
        onUpdateCoreCategory?.(activeCategoryConfig.id, { notes: newNotes });
        setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }, 300);
      }, 700);
    },
    [activeCategoryConfig?.id, onUpdateCoreCategory]
  );

  const handleNotesSaveImmediate = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (notesValue !== activeCategoryConfig?.notes) {
      setSaveStatus('saving');
      onUpdateCoreCategory?.(activeCategoryConfig.id, { notes: notesValue });
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    }
  }, [activeCategoryConfig?.id, activeCategoryConfig?.notes, notesValue, onUpdateCoreCategory]);

  const isWatchlistCategory =
    activeCategory === 'things-i-want-to-do-together' ||
    activeCategory === 'my-hobbies' ||
    activeCategory === 'things-i-want-to-do' ||
    activeCategory === 'foods-to-try';

  const activeFolderItems = useMemo(() => {
    return items.filter((item) => {
      if (item.categoryId !== activeCategoryConfig?.id) return false;
      if (filters.hasMediaOnly && !item.mediaUrl) return false;
      if (filters.hasTherapistAnswersOnly && !item.isHighlightedAnswer && !item.answers) return false;

      if (isWatchlistCategory && watchlistStatusFilter !== 'All') {
        if (item.status !== watchlistStatusFilter) return false;
      }

      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inContent = item.content.toLowerCase().includes(q);
        const inAnswers = (item.answers || '').toLowerCase().includes(q);
        const inTag = (item.dateTag || '').toLowerCase().includes(q);
        return inTitle || inContent || inAnswers || inTag;
      }

      return true;
    });
  }, [items, activeCategoryConfig?.id, filters, isWatchlistCategory, watchlistStatusFilter]);

  const { confirmDelete } = useConfirmDelete();

  const handleSaveItem = useCallback(
    (saved: CoreTopicItem) => {
      setItems((prevItems) => {
        const exists = prevItems.some((i) => i.id === saved.id);
        if (exists) {
          return prevItems.map((i) => (i.id === saved.id ? saved : i));
        } else {
          return [saved, ...prevItems];
        }
      });
      setShowItemModal(false);
      setEditingItem(null);
    },
    [setItems]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      confirmDelete({
        title: 'Delete Entry',
        message: 'Delete this entry?',
        confirmText: 'Delete',
        onConfirm: () => {
          setItems((prevItems) => prevItems.filter((i) => i.id !== id));
        },
      });
    },
    [confirmDelete, setItems]
  );

  const handleToggleComplete = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const nextStatus: ItemActivityStatus =
              item.status === 'Done Together'
                ? 'Done Alone'
                : item.status === 'Done Alone'
                ? 'To Watch/Read'
                : 'Done Together';
            return { ...item, status: nextStatus, isCompleted: nextStatus !== 'To Watch/Read' };
          }
          return item;
        })
      );
    },
    [setItems]
  );

  const handleUpdateStatus = useCallback(
    (id: string, newStatus: ItemActivityStatus) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: newStatus, isCompleted: newStatus !== 'To Watch/Read' }
            : item
        )
      );
    },
    [setItems]
  );

  const handleOpenAddEntryModal = useCallback(() => {
    setEditingItem(null);
    setShowItemModal(true);
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!activeCategoryConfig) return;
    exportCoreCategoryToPDF(activeCategoryConfig, activeFolderItems);
  }, [activeCategoryConfig, activeFolderItems]);

  const handleDeleteActiveCategory = useCallback(() => {
    if (!activeCategoryConfig || coreCategories.length <= 1) return;
    confirmDelete({
      title: `Delete "${activeCategoryConfig.title}"?`,
      message: `Delete folder "${activeCategoryConfig.title}" and its ${activeFolderItems.length} entries?`,
      confirmText: 'Delete',
      onConfirm: () => {
        onDeleteCoreCategory(activeCategoryConfig.id);
        const remaining = coreCategories.filter((c) => c.id !== activeCategoryConfig.id);
        if (remaining.length > 0) {
          setActiveCategory(remaining[0].id);
        }
      },
    });
  }, [activeCategoryConfig, activeFolderItems.length, confirmDelete, onDeleteCoreCategory, coreCategories, setActiveCategory]);

  const CurrentTopicIcon = activeCategoryConfig
    ? CATEGORY_ICON_MAP[activeCategoryConfig.iconName] || Folder
    : Folder;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* 1. Top Folder Navigation Bar */}
      <div className="bg-white dark:bg-[#1C1C1E] p-3.5 sm:p-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Active Folder Switcher */}
          <div className="relative flex-1 min-w-[200px]">
            <button
              onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
              className="w-full text-left px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/[0.07] dark:hover:bg-white/10 rounded-xl flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CurrentTopicIcon className={`w-4 h-4 shrink-0 ${currentAccent.textPrimary}`} />
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                  {activeCategoryConfig?.title}
                </span>
                <span className="text-[11px] text-stone-400 font-mono shrink-0">
                  ({activeFolderItems.length})
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${
                  isFolderDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Folder Dropdown Menu */}
            {isFolderDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30 bg-transparent"
                  onClick={() => setIsFolderDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl shadow-xl p-1.5 z-40 max-h-72 overflow-y-auto space-y-0.5 animate-in fade-in duration-100">
                  {coreCategories.map((cat) => {
                    const isSelected = activeCategory === cat.id;
                    const catCount = items.filter((i) => i.categoryId === cat.id).length;
                    const CatIcon = CATEGORY_ICON_MAP[cat.iconName] || Folder;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setIsFolderDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-black/5 dark:bg-white/10 text-stone-900 dark:text-stone-100'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CatIcon className={`w-3.5 h-3.5 shrink-0 ${currentAccent.textPrimary}`} />
                          <span className="truncate">{cat.title}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono ml-2">
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Action Controls & Dedicated Circular Folder '+' Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => prevCategory && setActiveCategory(prevCategory.id)}
              disabled={!prevCategory}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Previous Folder"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => nextCategory && setActiveCategory(nextCategory.id)}
              disabled={!nextCategory}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Next Folder"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportPDF}
              title="Export PDF"
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <FileDown className="w-4 h-4" />
            </button>

            {onOpenCommentSection && (
              <button
                onClick={() => onOpenCommentSection(`Folder: ${activeCategoryConfig?.title}`)}
                title="Comments"
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Dedicated Circular '+' Button for Folder Creation (Only Entry Point) */}
            {canEdit && (
              <button
                onClick={() => setShowAddCategoryModal(true)}
                title="Create New Folder (+)"
                className={`w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-stone-600 dark:text-stone-300 transition-colors shadow-2xs ${currentAccent.hoverText}`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}

            {/* Pin / Unpin Folder from Home */}
            {onTogglePinCategory && (
              <button
                onClick={() => onTogglePinCategory(activeCategory)}
                title={pinnedCategoryIds.includes(activeCategory) ? "Unpin folder from Home" : "Pin folder to Home"}
                className={`p-1.5 rounded-lg transition-colors ${
                  pinnedCategoryIds.includes(activeCategory)
                    ? currentAccent.tagBadge
                    : `text-stone-400 ${currentAccent.hoverText} hover:bg-black/5 dark:hover:bg-white/10`
                }`}
              >
                {pinnedCategoryIds.includes(activeCategory) ? (
                  <Pin className="w-4 h-4 fill-current" />
                ) : (
                  <Pin className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Rename / Edit Folder Settings */}
            {canEdit && activeCategoryConfig && (
              <button
                onClick={() => setShowEditCategoryModal(true)}
                title="Rename & Edit Folder"
                className={`p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${currentAccent.hoverText}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {canEdit && (
              <button
                onClick={handleOpenAddEntryModal}
                className={`ml-1 px-3 py-1.5 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-xs transition-colors ${currentAccent.buttonPrimary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Entry</span>
              </button>
            )}

            {isOwner && coreCategories.length > 1 && (
              <button
                onClick={handleDeleteActiveCategory}
                title="Delete Folder"
                className="p-1.5 text-stone-400 hover:text-rose-500 transition-colors ml-0.5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Watchlist Filter Pills */}
        {isWatchlistCategory && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
            {(['All', 'To Watch/Read', 'Done Alone', 'Done Together'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setWatchlistStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  watchlistStatusFilter === st
                    ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Prominent Topic Title & Integrated Bulleted Topic Notes Canvas */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 sm:p-6 rounded-2xl border border-black/5 dark:border-white/10 shadow-xs space-y-4">
        {/* Topic Title and Description */}
        <div className="border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl shrink-0 ${currentAccent.iconBox}`}>
              <CurrentTopicIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  <HighlightText text={activeCategoryConfig?.title} highlight={filters.searchQuery} />
                </h2>
                {canEdit && (
                  <button
                    onClick={() => setShowEditCategoryModal(true)}
                    title="Rename Folder"
                    className={`p-1 rounded-lg text-stone-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${currentAccent.hoverText}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {activeCategoryConfig?.description && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  <HighlightText text={activeCategoryConfig.description} highlight={filters.searchQuery} />
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bulleted Topic Notes Stream (Apple Minimalist Aesthetic) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Bulleted Notes & Thoughts</span>
            </span>
          </div>

          <BulletedNoteEditor
            value={notesValue}
            onChange={handleNotesChange}
            onSaveImmediate={handleNotesSaveImmediate}
            saveStatus={saveStatus}
            readOnly={isViewer}
            minRows={5}
            placeholder={`Add bullet points, reflections, or notes for "${activeCategoryConfig?.title}" (type - or • + Space to start a bullet)...`}
            searchQuery={filters.searchQuery}
          />
        </div>
      </div>

      {/* 3. Structured Entries Grid (If Any) */}
      <div className="space-y-3 animate-in fade-in duration-150">
        {activeFolderItems.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Folder Entries ({activeFolderItems.length})
            </span>
          </div>
        )}

        {activeCategory === 'questions-to-ask-her' && questionsLayoutMode === 'qa_dashboard' ? (
          <DeepQuestionsView
            items={items.filter((i) => i.categoryId === 'questions-to-ask-her')}
            currentUser={currentUser}
            searchQuery={filters.searchQuery}
            onUpdateItems={(updatedQuestions) => {
              setItems((prev) => {
                const otherItems = prev.filter((i) => i.categoryId !== 'questions-to-ask-her');
                return [...otherItems, ...updatedQuestions];
              });
            }}
            onOpenCommentSection={onOpenCommentSection}
          />
        ) : activeFolderItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeFolderItems.map((item) => (
              <TopicCategoryCard
                key={item.id}
                item={item}
                accentTheme={accentTheme}
                onEdit={(itm) => {
                  setEditingItem(itm);
                  setShowItemModal(true);
                }}
                onDelete={handleDeleteItem}
                onToggleComplete={handleToggleComplete}
                onUpdateStatus={handleUpdateStatus}
                onNavigateToWeek={onNavigateToWeek}
                canEdit={canEdit}
                canDelete={canEdit}
                isOwner={isOwner}
                onOpenCommentSection={onOpenCommentSection}
                activeCommentSectionTag={activeCommentSectionTag}
                searchQuery={filters.searchQuery}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Modal 1: Add / Edit Entry Modal */}
      {showItemModal && (
        <TopicItemModal
          item={editingItem}
          activeCategory={editingItem?.categoryId || activeCategory}
          coreCategories={coreCategories}
          onSave={handleSaveItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Modal 2: Add New Topic Folder Modal */}
      {showAddCategoryModal && (
        <AddCoreCategoryModal
          onSave={(newCat) => {
            onAddCoreCategory(newCat);
            setActiveCategory(newCat.id);
            setShowAddCategoryModal(false);
          }}
          onClose={() => setShowAddCategoryModal(false)}
        />
      )}

      {/* Modal 3: Rename & Edit Topic Folder Modal */}
      {showEditCategoryModal && activeCategoryConfig && (
        <EditCoreCategoryModal
          isOpen={showEditCategoryModal}
          category={activeCategoryConfig}
          onClose={() => setShowEditCategoryModal(false)}
          onSave={(catId, updated) => {
            onUpdateCoreCategory?.(catId, updated);
          }}
        />
      )}
    </div>
  );
});
