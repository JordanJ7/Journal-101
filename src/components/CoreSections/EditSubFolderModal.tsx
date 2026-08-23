import React, { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { CoreCategoryConfig, CoreSubCategoryConfig } from '../../types';

interface EditSubFolderModalProps {
  category: CoreCategoryConfig;
  subCategory: CoreSubCategoryConfig;
  onSave: (categoryId: string, subCategoryId: string, updated: Partial<CoreSubCategoryConfig>) => void;
  onClose: () => void;
}

export const EditSubFolderModal: React.FC<EditSubFolderModalProps> = ({
  category,
  subCategory,
  onSave,
  onClose,
}) => {
  const [label, setLabel] = useState(subCategory.label);
  const [description, setDescription] = useState(subCategory.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSave(category.id, subCategory.id, {
      label: label.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div
      id="edit-subfolder-modal-overlay"
      className="fixed inset-0 z-50 bg-black/75 flex justify-center items-center p-4"
      style={{
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        transform: 'translateZ(0)',
      }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141416] rounded-3xl p-6 border border-stone-200 dark:border-white/10 shadow-2xl max-w-md w-full space-y-4 relative"
        style={{
          contain: 'layout paint',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                Edit Sub-Folder
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Inside {category.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              Sub-Folder Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              Description / Notes (Optional)
            </label>
            <div
              className="w-full relative transform-gpu typing-isolation-container"
              style={{
                contain: 'layout paint',
                willChange: 'contents',
                transform: 'translateZ(0)',
              }}
            >
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-2xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
