import { ArrowLeft, BookOpen, Calendar, Printer, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CORE_CATEGORIES_CONFIG } from '../data/initialData';
import { AccentTheme, CoreTopicItem, SharedSnapshotData, WeeklyBlock } from '../types';
import { ACCENT_THEMES } from '../utils/theme';

interface SharedViewProps {
  shareId: string;
  onExitSharedView: () => void;
  accentTheme?: AccentTheme;
}

export const SharedView: React.FC<SharedViewProps> = ({
  shareId,
  onExitSharedView,
  accentTheme = 'amber',
}) => {
  const [snapshot, setSnapshot] = useState<SharedSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'weekly' | 'core'>('weekly');
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  useEffect(() => {
    async function fetchSharedData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/share/${shareId}`);
        if (!res.ok) {
          throw new Error('Shared snapshot not found');
        }
        const json = await res.json();
        setSnapshot(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load shared snapshot');
      } finally {
        setLoading(false);
      }
    }

    fetchSharedData();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className={`w-10 h-10 border-4 ${currentAccent.spinnerBorder} border-t-transparent rounded-full animate-spin mx-auto`} />
          <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
            Loading shared journal snapshot...
          </p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-850 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-lg text-center max-w-md w-full space-y-3">
          <h3 className="text-base font-bold text-rose-600">Snapshot Unavailable</h3>
          <p className="text-xs text-stone-500">{error || 'Unable to load snapshot data'}</p>
          <button
            onClick={onExitSharedView}
            className={`px-4 py-2 ${currentAccent.buttonPrimary} text-white text-xs font-semibold rounded-xl`}
          >
            Back to Journal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">
      {/* Top Shared Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#18181b] border-b border-stone-200 dark:border-stone-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitSharedView}
              className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {snapshot.title}
              </h1>
              <span className="text-[10px] text-stone-400 font-mono">
                Shared Snapshot: {snapshot.createdAt}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveTab('weekly')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'weekly'
                    ? `${currentAccent.bg500} text-white font-semibold`
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Weekly Journal
              </button>
              <button
                onClick={() => setActiveTab('core')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'core'
                    ? `${currentAccent.bg500} text-white font-semibold`
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Core Topics
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              title="Print view"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Shared Content */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
        {activeTab === 'weekly' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${currentAccent.textPrimary}`} />
              <span>Weekly Journal Timeline (Read-Only)</span>
            </h2>

            {snapshot.weeks.map((week) => (
              <div
                key={week.id}
                className="bg-white dark:bg-stone-850 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4"
              >
                <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                  <h3 className="text-base font-bold">{week.weekTitle}</h3>
                  <p className="text-xs text-stone-400 font-mono">
                    Period: {week.startDate} to {week.endDate}
                  </p>
                </div>

                {/* Bullets */}
                <div className="space-y-2">
                  {week.bullets.map((b) => (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border text-xs sm:text-sm ${
                        b.isAnswerHighlight
                          ? `${currentAccent.calloutBg} ${currentAccent.calloutBorder}`
                          : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      {b.isAnswerHighlight && (
                        <span className={`inline-block text-[10px] font-bold ${currentAccent.badge} px-2 py-0.5 rounded-full mb-1`}>
                          Therapist Answer / Callout
                        </span>
                      )}
                      <p className="leading-relaxed">{b.text}</p>
                      <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                        {b.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className={`w-5 h-5 ${currentAccent.textPrimary}`} />
              <span>Core Topics Dashboard (Read-Only)</span>
            </h2>

            {CORE_CATEGORIES_CONFIG.map((cat) => {
              const catItems = snapshot.coreItems.filter((i) => i.categoryId === cat.id);
              if (catItems.length === 0) return null;

              return (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-stone-850 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3"
                >
                  <h3 className={`text-base font-bold ${currentAccent.textPrimary}`}>
                    {cat.title}
                  </h3>

                  <div className="space-y-3">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border text-xs sm:text-sm ${
                          item.isHighlightedAnswer
                            ? `${currentAccent.calloutBg} ${currentAccent.calloutBorder}`
                            : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                        }`}
                      >
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
                          {item.title}
                        </h4>
                        <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-2">
                          {item.content}
                        </p>
                        {item.answers && (
                          <div className={`p-2.5 ${currentAccent.calloutBg} rounded-xl text-xs mt-2 border ${currentAccent.calloutBorder}`}>
                            <strong>Therapist Des Answer:</strong> {item.answers}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
