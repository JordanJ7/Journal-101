import React, { useEffect, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  Compass,
  Folder,
  Heart,
  HeartHandshake,
  HelpCircle,
  History,
  MessageCircle,
  MessageSquareText,
  Pencil,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Utensils,
  X,
  Check,
} from 'lucide-react';
import { CoreCategoryConfig } from '../../types';

interface EditCoreCategoryModalProps {
  isOpen: boolean;
  category: CoreCategoryConfig | null;
  onSave: (categoryId: string, updated: Partial<CoreCategoryConfig>) => void;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Folder', label: 'Folder', icon: Folder },
  { name: 'MessageSquareText', label: 'Message', icon: MessageSquareText },
  { name: 'HeartHandshake', label: 'Together', icon: HeartHandshake },
  { name: 'Heart', label: 'Heart', icon: Heart },
  { name: 'HelpCircle', label: 'Questions', icon: HelpCircle },
  { name: 'BookOpenCheck', label: 'Journal', icon: BookOpenCheck },
  { name: 'Sparkles', label: 'Memories', icon: Sparkles },
  { name: 'Compass', label: 'Goals', icon: Compass },
  { name: 'Utensils', label: 'Food', icon: Utensils },
  { name: 'ShoppingBag', label: 'Items', icon: ShoppingBag },
  { name: 'MessageCircle', label: 'Talk', icon: MessageCircle },
  { name: 'History', label: 'History', icon: History },
  { name: 'ShieldAlert', label: 'Growth', icon: ShieldAlert },
  { name: 'UserCheck', label: 'About', icon: UserCheck },
  { name: 'Activity', label: 'Hobbies', icon: Activity },
];

export const EditCoreCategoryModal: React.FC<EditCoreCategoryModalProps> = ({
  isOpen,
  category,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');

  useEffect(() => {
    if (category) {
      setTitle(category.title);
      setDescription(category.description || '');
      setSelectedIcon(category.iconName || 'Folder');
    }
  }, [category, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(category.id, {
      title: title.trim(),
      description: description.trim(),
      iconName: selectedIcon,
    });
    onClose();
  };

  return (
    <div
      id="edit-core-category-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 overflow-y-auto"
      style={{
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        transform: 'translateZ(0)',
      }}
      onClick={onClose}
    >
      <div
        id="edit-core-category-modal-card"
        className="bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 relative"
        style={{
          contain: 'layout paint',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Rename & Edit Folder
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Update topic directory settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Folder Name <span className="text-blue-600 dark:text-blue-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Life Vision, Book Assignment..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-stone-50 dark:bg-black/40 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-semibold placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="Brief summary or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-stone-50 dark:bg-black/40 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm sm:text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Folder Icon
            </label>
            <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-stone-50 dark:bg-black/30 rounded-xl border border-stone-200 dark:border-white/5">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    title={item.label}
                    className={`min-h-[40px] p-2 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs font-semibold scale-105'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
