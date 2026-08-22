import React, { useState, useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Compass,
  Folder,
  FolderOpen,
  HelpCircle,
  History,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Palette,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { AccentTheme, CoreCategoryConfig, CoreTopicItem } from '../types';
import { ACCENT_THEMES } from '../utils/theme';

interface CustomizePinnedTopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CoreCategoryConfig[];
  coreItems: CoreTopicItem[];
  pinnedCategoryIds: string[];
  onSavePinned: (newPinnedIds: string[]) => void;
  accentTheme: AccentTheme;
}

// Icon dictionary matching topic icons
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Palette,
  History,
  Sparkles,
  Compass,
  Folder,
  FolderOpen,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
};

const DEFAULT_RECOMMENDED_IDS = [
  'foods-to-try',
  'my-hobbies',
  'backstory-stuff',
  'things-i-want-to-do',
];

export const CustomizePinnedTopicsModal: React.FC<CustomizePinnedTopicsModalProps> = ({
  isOpen,
  onClose,
  categories,
  coreItems,
  pinnedCategoryIds,
  onSavePinned,
  accentTheme,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...pinnedCategoryIds]);
  const [searchQuery, setSearchQuery] = useState('');

  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  if (!isOpen) return null;

  // Toggle selection
  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Move up in order
  const handleMoveUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  // Move down in order
  const handleMoveDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  // Reset to default 4
  const handleResetToDefault = () => {
    // Find matching categories in existing list
    const validDefaults = DEFAULT_RECOMMENDED_IDS.filter((defId) =>
      categories.some((c) => c.id.toLowerCase() === defId.toLowerCase())
    );
    if (validDefaults.length > 0) {
      setSelectedIds(validDefaults);
    } else {
      setSelectedIds(categories.slice(0, 4).map((c) => c.id));
    }
  };

  const handleSave = () => {
    onSavePinned(selectedIds);
    onClose();
  };

  // Filtered categories
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.title.toLowerCase().includes(q) ||
      cat.id.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#1C1C1E] border border-stone-200/80 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-1" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${currentAccent.iconBox}`}>
                <Pin className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                Customize Pinned Topics
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Select and order the folders you want featured on the Home overview.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search topic folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs bg-stone-100 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 ${currentAccent.ring}`}
            />
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            title="Reset to 4 Default Topics"
            className="px-2.5 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/10 flex items-center gap-1 shrink-0 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>

        {/* Selected Count Badge */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1 shrink-0">
          <span>
            <strong className="text-stone-900 dark:text-stone-100 font-semibold">{selectedIds.length}</strong>{' '}
            {selectedIds.length === 1 ? 'folder pinned' : 'folders pinned'}
          </span>
          <span className="text-[11px] text-stone-400">
            Use arrows to reorder
          </span>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 min-h-[220px]">
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No folders found matching "{searchQuery}".
            </div>
          ) : (
            filteredCategories.map((category) => {
              const isPinned = selectedIds.includes(category.id);
              const pinIndex = selectedIds.indexOf(category.id);
              const IconComp = ICON_MAP[category.iconName] || Folder;
              const noteCount = coreItems.filter((i) => i.categoryId === category.id).length;

              return (
                <div
                  key={category.id}
                  onClick={() => handleToggle(category.id)}
                  className={`w-full h-auto min-h-[52px] py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 box-border group select-none ${
                    isPinned
                      ? `${currentAccent.activeBorder} ${currentAccent.iconBoxSelected} text-stone-900 dark:text-stone-100 shadow-2xs`
                      : 'bg-stone-50/80 dark:bg-white/[0.02] border-stone-200/80 dark:border-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-100/90 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Left: Icon, Title, Badge */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 py-0.5">
                    <span
                      className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                        isPinned
                          ? `${currentAccent.bg500} text-white shadow-2xs`
                          : `bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400 ${currentAccent.groupHoverText}`
                      }`}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-left leading-snug break-words whitespace-normal">
                          {category.title}
                        </span>
                        {isPinned && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${currentAccent.tagBadge}`}>
                            #{pinIndex + 1}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug break-words whitespace-normal mt-0.5">
                        {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                        {category.description ? ` • ${category.description}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Right: Reorder Arrows + Checkbox/Pin Button */}
                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {isPinned && (
                      <div className="flex items-center gap-0.5 mr-1 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleMoveUp(category.id, e)}
                          disabled={pinIndex === 0}
                          title="Move up"
                          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20 disabled:hover:text-stone-400"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMoveDown(category.id, e)}
                          disabled={pinIndex === selectedIds.length - 1}
                          title="Move down"
                          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20 disabled:hover:text-stone-400"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggle(category.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isPinned
                          ? `${currentAccent.bg500} text-white shadow-2xs`
                          : 'bg-black/5 dark:bg-white/10 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
                      }`}
                      title={isPinned ? 'Unpin from Home' : 'Pin to Home'}
                    >
                      {isPinned ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200/80 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 flex items-center gap-1.5"
            style={{ backgroundColor: currentAccent.colorHex }}
          >
            <Check className="w-4 h-4" />
            <span>Apply ({selectedIds.length} Pinned)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
