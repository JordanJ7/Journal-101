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
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Utensils,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { CoreCategoryConfig } from '../../types';

interface AddCoreCategoryModalProps {
  onSave: (newCat: CoreCategoryConfig) => void;
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

export const AddCoreCategoryModal: React.FC<AddCoreCategoryModalProps> = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newCat: CoreCategoryConfig = {
      id: `cat-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Custom topic folder',
      iconName: selectedIcon,
      notes: '',
      isCustom: true,
    };

    onSave(newCat);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/15 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Folder className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              New Topic Folder
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
              Folder Name <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Life Vision, Book Assignment..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 font-semibold placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm sm:text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="Brief summary or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm sm:text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
              Folder Icon
            </label>
            <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/5 dark:border-white/5">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    title={item.label}
                    className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs font-semibold'
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
              className="px-3.5 py-2 text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

