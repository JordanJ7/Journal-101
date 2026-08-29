import React, { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { CoreCategoryConfig, CoreSubCategoryConfig } from '../../types';

interface AddSubFolderModalProps {
  parentCategory: CoreCategoryConfig;
  allCategories?: CoreCategoryConfig[];
  onSave: (categoryId: string, newSubFolder: CoreSubCategoryConfig) => void;
  onClose: () => void;
}

export const AddSubFolderModal: React.FC<AddSubFolderModalProps> = ({
  parentCategory,
  allCategories = [parentCategory],
  onSave,
  onClose,
}) => {
  const [selectedCatId, setSelectedCatId] = useState(parentCategory.id);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newSubFolder: CoreSubCategoryConfig = {
      id: `${slug}-${Date.now().toString(36)}`,
      label: label.trim(),
      description: description.trim() || undefined,
    };

    onSave(selectedCatId, newSubFolder);
  };

  return (
    <div
      id="add-subfolder-modal-overlay"
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
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                Add New Sub-Folder
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Inside {parentCategory.title}
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
          {allCategories.length > 1 && (
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Parent Topic Category
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              Sub-Folder Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Deep Reflections, Personal Breakthroughs, Childhood Memories..."
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
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = `${Math.max(56, el.scrollHeight)}px`;
                  }
                }}
                rows={2}
                placeholder="Brief context on what belongs in this sub-folder..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden min-h-[56px]"
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
              Create Sub-Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
