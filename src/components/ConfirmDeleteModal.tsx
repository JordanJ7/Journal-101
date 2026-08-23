import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface DeleteConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDeleteContextType {
  confirmDelete: (options: DeleteConfirmOptions) => void;
}

const ConfirmDeleteContext = createContext<ConfirmDeleteContextType>({
  confirmDelete: () => {},
});

export const useConfirmDelete = () => useContext(ConfirmDeleteContext);

export const ConfirmDeleteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const confirmDelete = useCallback((options: DeleteConfirmOptions) => {
    setModalState({
      isOpen: true,
      title: options.title || 'Are you sure you want to delete?',
      message: options.message || 'This action cannot be undone and will permanently remove this item.',
      confirmText: options.confirmText || 'Delete',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: options.onConfirm,
    });
  }, []);

  const handleClose = () => {
    setModalState(null);
  };

  const handleConfirm = async () => {
    if (modalState?.onConfirm) {
      await modalState.onConfirm();
    }
    handleClose();
  };

  return (
    <ConfirmDeleteContext.Provider value={{ confirmDelete }}>
      {children}

      {/* Global In-App Confirm Delete Modal */}
      {modalState?.isOpen && (
        <div
          id="confirm-delete-modal-overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f0f11]/90 animate-in fade-in duration-150 transform-gpu will-change-transform isolate"
          onClick={handleClose}
        >
          <div
            id="confirm-delete-modal-container"
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-5 animate-in zoom-in-95 duration-150 transform-gpu will-change-transform isolate"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
                  {modalState.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {modalState.message}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                id="cancel-delete-btn"
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 font-semibold text-xs sm:text-sm transition-colors"
              >
                {modalState.cancelText}
              </button>

              <button
                id="confirm-delete-action-btn"
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{modalState.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDeleteContext.Provider>
  );
};
