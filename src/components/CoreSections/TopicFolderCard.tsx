import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  FileDown,
  Folder,
  FolderOpen,
  Heart,
  HelpCircle,
  ListTodo,
  MessageSquare,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import { AccentTheme, CoreCategoryConfig, CoreTopicItem, ItemActivityStatus } from '../../types';
import { exportCoreCategoryToPDF } from '../../utils/pdfExport';
import { ACCENT_THEMES } from '../../utils/theme';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { HighlightText } from '../HighlightText';
import { TopicCategoryCard } from './TopicCategoryCard';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  MessageSquareText,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Heart,
  ListTodo,
  CheckSquare,
  Utensils,
  BookOpen,
};

interface TopicFolderCardProps {
  category: CoreCategoryConfig;
  allItems: CoreTopicItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddEntry: (catId: string) => void;
  onEditEntry: (item: CoreTopicItem) => void;
  onDeleteEntry: (id: string) => void;
  onToggleComplete?: (item: CoreTopicItem) => void;
  onUpdateStatus?: (item: CoreTopicItem, newStatus: ItemActivityStatus) => void;
  onNavigateToWeek?: (weekId: string) => void;
  currentUser: CurrentUserProfile;
  onOpenCommentSection?: (sectionTag: string) => void;
  activeCommentSectionTag?: string;
  searchQuery?: string;
  accentTheme: AccentTheme;
  onDeleteCategory?: (catId: string) => void;
}

export const TopicFolderCard: React.FC<TopicFolderCardProps> = React.memo(({
  category,
  allItems,
  isExpanded,
  onToggleExpand,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onToggleComplete,
  onUpdateStatus,
  onNavigateToWeek,
  currentUser,
  onOpenCommentSection,
  activeCommentSectionTag,
  searchQuery = '',
  accentTheme,
  onDeleteCategory,
}) => {
  const isOwner = currentUser.role === 'owner';
  const canEdit = currentUser.role === 'owner' || currentUser.role === 'editor';
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  // Filter items specifically for this topic folder
  const categoryItems = useMemo(() => {
    return allItems.filter((i) => i.categoryId === category.id);
  }, [allItems, category.id]);

  const IconComp = ICON_MAP[category.iconName] || MessageSquareText;
  const { confirmDelete } = useConfirmDelete();

  const handleExportPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportCoreCategoryToPDF(category, categoryItems);
  };

  const handleDeleteCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteCategory) return;

    confirmDelete({
      title: `Delete Topic Folder "${category.title}"?`,
      message: `Are you sure you want to permanently delete this topic folder and all ${categoryItems.length} entries inside it? This cannot be undone.`,
      confirmText: 'Delete Topic Folder',
      onConfirm: () => {
        onDeleteCategory(category.id);
      },
    });
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddEntry(category.id);
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-xs overflow-hidden transition-all duration-200">
      {/* Topic Folder Header */}
      <div
        onClick={onToggleExpand}
        className="w-full text-left p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors border-b border-transparent"
        style={{
          borderBottomColor: isExpanded ? 'rgba(120, 113, 108, 0.15)' : 'transparent',
        }}
      >
        {/* Left: Folder Icon & Topic Info */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          {/* Animated Chevron */}
          <button
            type="button"
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg shrink-0 mt-0.5 sm:mt-0"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>

          {/* Folder Graphic Badge */}
          <div
            className="p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{
              backgroundColor: `${currentAccent.colorHex}18`,
              color: currentAccent.colorHex,
            }}
          >
            {isExpanded ? (
              <FolderOpen className="w-5 h-5" />
            ) : (
              <Folder className="w-5 h-5" />
            )}
          </div>

          {/* Title & Description */}
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 leading-snug break-words whitespace-normal">
                <HighlightText text={category.title} searchQuery={searchQuery} />
              </h3>

              {/* Items Counter Badge */}
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs font-mono"
                style={{
                  backgroundColor: `${currentAccent.colorHex}20`,
                  color: currentAccent.colorHex,
                }}
              >
                {categoryItems.length} {categoryItems.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {category.description && (
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5 break-words whitespace-normal leading-relaxed">
                <HighlightText text={category.description} searchQuery={searchQuery} />
              </p>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center ml-auto">
          {/* Export to PDF button */}
          <button
            type="button"
            onClick={handleExportPDF}
            title={`Export ${category.title} to PDF`}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <FileDown className={`w-4 h-4 ${currentAccent.textPrimary}`} />
            <span className="hidden md:inline">Export PDF</span>
          </button>

          {/* Add Entry to this Folder Button */}
          {canEdit && (
            <button
              type="button"
              onClick={handleAddClick}
              title="Add entry into this topic folder"
              className="px-3 py-1.5 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-opacity hover:opacity-90"
              style={{ backgroundColor: currentAccent.colorHex }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          )}

          {/* Delete Category (Owner Only) */}
          {isOwner && onDeleteCategory && (
            <button
              type="button"
              onClick={handleDeleteCategory}
              title="Delete this topic folder"
              className="p-2 rounded-xl text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Topic Folder Contents */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-stone-50/50 dark:bg-stone-900/40 border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in duration-150">
          {categoryItems.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white/70 dark:bg-stone-800/40 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
              <Folder className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                This topic folder is currently empty.
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Add your first reflection, question, or thought to keep it organized in this topic.
              </p>
              {canEdit && (
                <button
                  onClick={handleAddClick}
                  className="mt-4 px-4 py-2 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-2xs transition-opacity hover:opacity-90"
                  style={{ backgroundColor: currentAccent.colorHex }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Entry</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryItems.map((item) => (
                <TopicCategoryCard
                  key={item.id}
                  item={item}
                  accentTheme={accentTheme}
                  onEdit={onEditEntry}
                  onDelete={onDeleteEntry}
                  onToggleComplete={onToggleComplete}
                  onUpdateStatus={onUpdateStatus}
                  onNavigateToWeek={onNavigateToWeek}
                  canEdit={canEdit}
                  canDelete={canEdit}
                  isOwner={isOwner}
                  onOpenCommentSection={onOpenCommentSection}
                  activeCommentSectionTag={activeCommentSectionTag}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
