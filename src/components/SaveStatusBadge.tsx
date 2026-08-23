import React from 'react';
import { Check, Loader2, Clock, AlertCircle } from 'lucide-react';

export type SaveStatusState = 'idle' | 'countdown' | 'unsaved' | 'saving' | 'saved' | 'error';

export interface SaveStatusBadgeProps {
  status: SaveStatusState;
  secondsRemaining?: number;
  errorMessage?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Isolated SaveStatusBadge component
 * Encapsulates the save status badge and countdown timer in its own isolated component boundary.
 * Prevents parent layout containers, modals, and backdrop overlays from re-rendering on timer ticks.
 */
export const SaveStatusBadge = React.memo<SaveStatusBadgeProps>(
  ({ status, secondsRemaining = 2, errorMessage, className = '', showIcon = true }) => {
    if (status === 'idle') return null;

    return (
      <div
        className={`inline-flex items-center select-none ${className}`}
        style={{
          contain: 'layout paint',
          willChange: 'contents',
          transform: 'translateZ(0)',
        }}
      >
        {status === 'countdown' && (
          <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400/90 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
            {showIcon && <Clock className="w-3 h-3 text-amber-500 animate-pulse" />}
            <span>Auto-saving in {secondsRemaining}s...</span>
          </span>
        )}

        {status === 'unsaved' && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
            {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            <span>Unsaved</span>
          </span>
        )}

        {status === 'saving' && (
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/50">
            {showIcon && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
            <span>Saving...</span>
          </span>
        )}

        {status === 'saved' && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
            {showIcon && <Check className="w-3 h-3 text-emerald-500" />}
            <span>Saved</span>
          </span>
        )}

        {status === 'error' && (
          <span
            className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/50"
            title={errorMessage || 'Failed to save to cloud'}
          >
            {showIcon && <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
            <span>{errorMessage ? 'Save failed' : 'Failed to save'}</span>
          </span>
        )}
      </div>
    );
  }
);

SaveStatusBadge.displayName = 'SaveStatusBadge';
