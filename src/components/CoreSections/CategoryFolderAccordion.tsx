import {
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  FileDown,
  Folder,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import {
  AccentTheme,
  CoreCategoryConfig,
  CoreSubCategoryConfig,
  CoreTopicItem,
  ItemActivityStatus,
} from '../../types';
import { exportCoreCategoryToPDF } from '../../utils/pdfExport';
import { ACCENT_THEMES } from '../../utils/theme';
import { HighlightText } from '../HighlightText';
import { TopicCategoryCard } from './TopicCategoryCard';

interface CategoryFolderAccordionProps {
  category: CoreCategoryConfig;
  allItems: CoreTopicItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  expandedSubCategories: Record<string, boolean>;
  onToggleSubCategory: (subCatId: string) => void;
  onAddSubFolder: (category: CoreCategoryConfig) => void;
  onEditSubFolder: (category: CoreCategoryConfig, sub: CoreSubCategoryConfig) => void;
  onDeleteSubFolder: (categoryId: string, subCatId: string) => void;
  onAddEntry: (categoryId: string, subCatId?: string) => void;
  onEditEntry: (item: CoreTopicItem) => void;
  onDeleteEntry: (id: string) => void;
  onToggleComplete: (item: CoreTopicItem) => void;
  onUpdateStatus: (item: CoreTopicItem, newStatus: ItemActivityStatus) => void;
  onNavigateToWeek?: (weekId: string) => void;
  currentUser: CurrentUserProfile;
  onOpenCommentSection?: (sectionTag: string) => void;
  activeCommentSectionTag?: string;
  searchQuery?: string;
  accentTheme: AccentTheme;
  onDeleteCategory?: (catId: string) => void;
}

export const CategoryFolderAccordion: React.FC<CategoryFolderAccordionProps> = ({
  category,
  allItems,
  isExpanded,
  onToggleExpand,
  expandedSubCategories,
  onToggleSubCategory,
  onAddSubFolder,
  onEditSubFolder,
  onDeleteSubFolder,
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
  const canDelete = isOwner || currentUser.role === 'editor';

  const [activeSubMenuId, setActiveSubMenuId] = useState<string | null>(null);

  const categoryItems = allItems.filter((i) => i.categoryId === category.id);
  const subCategories = category.subCategories || [];
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  // Uncategorized items (items in this category that don't match any subcategory)
  const uncategorizedItems = subCategories.length > 0
    ? categoryItems.filter((i) => !i.subCategoryId || !subCategories.some((s) => s.id === i.subCategoryId))
    : categoryItems;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-all">
      {/* Top-Level Folder Header */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-stone-50/60 dark:bg-stone-900/60 hover:bg-stone-100/50 dark:hover:bg-stone-800/40 transition-colors border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onToggleExpand}
          className="flex-1 min-w-[240px] flex items-start sm:items-center gap-3 text-left group"
        >
          <div className="p-2 rounded-2xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/80 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5 sm:mt-0 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 transition-transform" />
            ) : (
              <ChevronRight className="w-5 h-5 transition-transform" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <HighlightText text={category.title} highlight={searchQuery} />
              </span>

              {/* Badges */}
              {subCategories.length > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {subCategories.length} Sub-Folders
                </span>
              ) : null}
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                {categoryItems.length} Entries
              </span>
            </div>

            {category.description && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium leading-snug">
                <HighlightText text={category.description} highlight={searchQuery} />
              </p>
            )}
          </div>
        </button>

        {/* Top-level actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Export PDF */}
          <button
            onClick={() => exportCoreCategoryToPDF(category, allItems)}
            title="Export as PDF"
            className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">PDF</span>
          </button>

          {/* Add Sub-Folder (Owner / Editor) */}
          {canEdit && (
            <button
              onClick={() => onAddSubFolder(category)}
              title="Add a new sub-folder to this category"
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Add Sub-Folder</span>
            </button>
          )}

          {/* Add Entry (Owner / Editor) */}
          {canEdit && (
            <button
              onClick={() => onAddEntry(category.id)}
              className="px-3 py-1.5 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
              style={{ backgroundColor: currentAccent.colorHex }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          )}

          {/* Delete Category (Owner Only) */}
          {isOwner && onDeleteCategory && (
            <button
              onClick={() => onDeleteCategory(category.id)}
              title="Delete Category"
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Folder Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5 bg-stone-50/40 dark:bg-stone-950/20 animate-in fade-in duration-200">
          {/* Sub-Folders List (Accordion) */}
          {subCategories.length > 0 && (
            <div className="space-y-3.5">
              {subCategories.map((sub) => {
                const isSubExpanded = !!expandedSubCategories[sub.id];
                const subItems = categoryItems.filter((i) => i.subCategoryId === sub.id);

                return (
                  <div
                    key={sub.id}
                    className="ml-2 sm:ml-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-2xs overflow-hidden"
                  >
                    {/* Sub-Folder Header Card */}
                    <div className="p-3.5 sm:p-4 flex items-center justify-between gap-2.5 bg-stone-100/60 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors">
                      <button
                        onClick={() => onToggleSubCategory(sub.id)}
                        className="flex-1 flex items-start sm:items-center gap-2.5 text-left group"
                      >
                        <div className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5 sm:mt-0">
                          {isSubExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              📁 <HighlightText text={sub.label} highlight={searchQuery} />
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {subItems.length} {subItems.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          {sub.description && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-medium leading-relaxed">
                              <HighlightText text={sub.description} highlight={searchQuery} />
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Subfolder Quick Actions */}
                      <div className="flex items-center gap-1 relative flex-shrink-0">
                        {canEdit && (
                          <button
                            onClick={() => onAddEntry(category.id, sub.id)}
                            title={`Add Entry to ${sub.label}`}
                            className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span className="hidden sm:inline">Add Entry</span>
                          </button>
                        )}

                        {canEdit && (
                          <div className="relative">
                            <button
                              onClick={() => setActiveSubMenuId(activeSubMenuId === sub.id ? null : sub.id)}
                              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeSubMenuId === sub.id && (
                              <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl p-1 w-36 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => {
                                    setActiveSubMenuId(null);
                                    onEditSubFolder(category, sub);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit Folder</span>
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setActiveSubMenuId(null);
                                      onDeleteSubFolder(category.id, sub.id);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete Folder</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-Folder Entries Accordion Body */}
                    {isSubExpanded && (
                      <div className="p-3.5 sm:p-4 space-y-3 bg-white dark:bg-stone-900 border-t border-stone-200/70 dark:border-stone-800 animate-in fade-in duration-150">
                        {subItems.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                            <p className="text-xs italic text-stone-500 dark:text-stone-400 font-medium">
                              No entries in "{sub.label}" yet.
                            </p>
                            {canEdit && (
                              <button
                                onClick={() => onAddEntry(category.id, sub.id)}
                                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add the first entry</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          subItems.map((item) => (
                            <TopicCategoryCard
                              key={item.id}
                              item={item}
                              onEdit={onEditEntry}
                              onDelete={onDeleteEntry}
                              onToggleComplete={onToggleComplete}
                              onUpdateStatus={onUpdateStatus}
                              onNavigateToWeek={onNavigateToWeek}
                              canEdit={canEdit}
                              canDelete={canDelete}
                              isOwner={isOwner}
                              onOpenCommentSection={onOpenCommentSection}
                              activeCommentSectionTag={activeCommentSectionTag}
                              searchQuery={searchQuery}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Uncategorized or Root Entries */}
          {uncategorizedItems.length > 0 && (
            <div className="space-y-3 pt-2">
              {subCategories.length > 0 && (
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-2">
                  General / Uncategorized Entries ({uncategorizedItems.length})
                </h4>
              )}
              {uncategorizedItems.map((item) => (
                <TopicCategoryCard
                  key={item.id}
                  item={item}
                  onEdit={onEditEntry}
                  onDelete={onDeleteEntry}
                  onToggleComplete={onToggleComplete}
                  onUpdateStatus={onUpdateStatus}
                  onNavigateToWeek={onNavigateToWeek}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  isOwner={isOwner}
                  onOpenCommentSection={onOpenCommentSection}
                  activeCommentSectionTag={activeCommentSectionTag}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {/* Empty Category State */}
          {categoryItems.length === 0 && subCategories.length === 0 && (
            <div className="text-center py-8 bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                No entries saved in {category.title} yet.
              </p>
              {canEdit && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => onAddEntry(category.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Entry</span>
                  </button>
                  <button
                    onClick={() => onAddSubFolder(category)}
                    className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-xs flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Create Sub-Folder</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
