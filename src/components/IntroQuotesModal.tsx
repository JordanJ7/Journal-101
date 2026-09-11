import React, { useState } from 'react';
import {
  X,
  Quote,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { DEFAULT_INTRO_QUOTE } from './EntranceOverlay';

interface IntroQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntroQuotesModal: React.FC<IntroQuotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const introQuotes = useJournalStore((s) => s.introQuotes) || [];
  const addIntroQuote = useJournalStore((s) => s.addIntroQuote);
  const removeIntroQuote = useJournalStore((s) => s.removeIntroQuote);
  const setIntroQuotes = useJournalStore((s) => s.setIntroQuotes);
  const currentUser = useJournalStore((s) => s.currentUser);
  const hasReceivedFirstFirestoreSnapshot = useJournalStore(
    (s) => s.hasReceivedFirstFirestoreSnapshot
  );

  const [newQuoteText, setNewQuoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { confirmDelete } = useConfirmDelete();

  const canEdit =
    currentUser.role === 'owner' || currentUser.role === 'editor';

  if (!isOpen) return null;

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setStatusMsg(null);
      setTimeout(() => setErrorMsg(null), 3000);
    } else {
      setStatusMsg(msg);
      setErrorMsg(null);
      setTimeout(() => setStatusMsg(null), 2500);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQuoteText.trim();
    if (!trimmed) return;
    if (!canEdit) {
      showFeedback('You must be an owner or editor to add quotes.', true);
      return;
    }
    if (!hasReceivedFirstFirestoreSnapshot) {
      showFeedback('Syncing with cloud, please wait a moment...', true);
      return;
    }

    // Check for exact duplicates
    if (introQuotes.some((q) => q.toLowerCase() === trimmed.toLowerCase())) {
      showFeedback('This quote is already in your list.', true);
      return;
    }

    try {
      setIsSubmitting(true);
      await addIntroQuote(trimmed);
      setNewQuoteText('');
      showFeedback('Quote added successfully');
    } catch (err: any) {
      console.error('Failed to add quote:', err);
      showFeedback(err?.message || 'Failed to save quote to cloud', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveQuote = (index: number, quote: string) => {
    if (!canEdit) return;
    confirmDelete({
      title: 'Remove Intro Quote',
      message: `Are you sure you want to remove "${quote}" from the intro rotation?`,
      confirmText: 'Remove Quote',
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await removeIntroQuote(index);
          showFeedback('Quote removed');
        } catch (err: any) {
          console.error('Failed to remove quote:', err);
          showFeedback('Failed to remove quote', true);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleClearAll = () => {
    if (!canEdit || introQuotes.length === 0) return;
    confirmDelete({
      title: 'Reset to Default Quote',
      message:
        'Remove all custom quotes? The intro animation will revert to the default quote: "Love Is A Catalyst for Change".',
      confirmText: 'Reset to Default',
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await setIntroQuotes([]);
          showFeedback('Reset to default quote');
        } catch (err: any) {
          console.error('Failed to reset quotes:', err);
          showFeedback('Failed to reset quotes', true);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handlePreviewAnimation = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('replay-intro'));
    }, 150);
  };

  return (
    <div
      id="intro-quotes-modal-overlay"
      className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        transform: 'translateZ(0)',
      }}
      onClick={onClose}
    >
      <div
        id="intro-quotes-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-quotes-modal-title"
        className="bg-white dark:bg-[#141416] border border-black/5 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto relative pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
        style={{
          contain: 'layout paint',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-amber-500 shrink-0" />
            <h2
              id="intro-quotes-modal-title"
              className="text-base sm:text-sm font-bold text-stone-900 dark:text-stone-100"
            >
              Intro Screen Quotes
            </h2>
          </div>
          <button
            id="close-intro-quotes-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Feedback Messages */}
        {statusMsg && (
          <div
            role="status"
            className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status / Overview Card */}
        <div className="bg-stone-100/80 dark:bg-white/5 rounded-xl p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Intro Animation Mode
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300">
              {introQuotes.length === 0
                ? 'Default Quote'
                : `${introQuotes.length} In Rotation`}
            </span>
          </div>
          {introQuotes.length === 0 ? (
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
              No custom quotes added yet. The default quote{' '}
              <span className="font-medium text-stone-900 dark:text-stone-100">
                “{DEFAULT_INTRO_QUOTE}”
              </span>{' '}
              displays on every app load. Add quotes below to randomize the
              entrance animation.
            </p>
          ) : (
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
              On each app load or replay, one quote is chosen randomly from your
              curated roster and displayed with the typewriter animation.
            </p>
          )}
        </div>

        {/* Add Quote Form (Restricted to Owner / Editor) */}
        {canEdit ? (
          <form onSubmit={handleAddQuote} className="space-y-2">
            <label
              htmlFor="new-intro-quote-input"
              className="block text-xs font-semibold text-stone-800 dark:text-stone-200"
            >
              Add New Quote
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="new-intro-quote-input"
                type="text"
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="e.g., The best time to plant a tree was 20 years ago..."
                maxLength={140}
                disabled={isSubmitting}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                id="add-intro-quote-submit-btn"
                type="submit"
                disabled={isSubmitting || !newQuoteText.trim()}
                className="min-h-[42px] px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Quote</span>
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px] text-stone-400 px-1">
              <span>Syncs automatically across devices via Firestore.</span>
              <span>{newQuoteText.length}/140</span>
            </div>
          </form>
        ) : (
          <div className="p-3 bg-stone-100/60 dark:bg-white/5 rounded-xl text-xs text-stone-500 dark:text-stone-400">
            View-only access: Only the owner and editors can add or remove intro
            quotes.
          </div>
        )}

        {/* Quotes Roster */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              Active Rotation ({introQuotes.length})
            </span>
            {canEdit && introQuotes.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isSubmitting}
                className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div
            id="intro-quotes-list"
            className="space-y-2 max-h-60 overflow-y-auto pr-1"
          >
            {introQuotes.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-white/10 text-center text-xs text-stone-500 dark:text-stone-400 space-y-1">
                <p className="font-medium">Active Fallback:</p>
                <p className="font-serif italic text-stone-700 dark:text-stone-300">
                  “{DEFAULT_INTRO_QUOTE}”
                </p>
              </div>
            ) : (
              introQuotes.map((quote, idx) => (
                <div
                  key={`${quote}-${idx}`}
                  className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/5 text-xs transition-colors hover:border-amber-500/30"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 mt-0.5 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="font-serif text-stone-800 dark:text-stone-200 italic leading-relaxed break-words">
                      “{quote}”
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuote(idx, quote)}
                      disabled={isSubmitting}
                      title="Remove this quote"
                      aria-label={`Remove quote ${quote}`}
                      className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="pt-2 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handlePreviewAnimation}
            className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors border border-stone-200 dark:border-white/10"
          >
            <Play className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Test Intro Animation</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[40px] px-5 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
