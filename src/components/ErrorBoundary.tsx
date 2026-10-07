import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useJournalStore } from '../store/useJournalStore';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    try {
      useJournalStore.getState().flushAutoSave();
    } catch (saveErr) {
      console.warn('Failed to flush auto save during error recovery:', saveErr);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0c0c0e] text-stone-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-md bg-[#18181b] rounded-[14px] border border-stone-800 p-6 sm:p-8 space-y-5 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                An unexpected error occurred. Your changes were flushed to storage. Reload to continue writing.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 bg-stone-900/90 rounded-lg text-left text-[11px] font-mono text-stone-400 border border-stone-800 break-words max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
