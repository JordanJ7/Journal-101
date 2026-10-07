import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  Edit2,
  FileText,
  Printer,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { AccentTheme, BulletPoint, WeeklyBlock } from '../../types';
import { exportSessionPrepToPDF } from '../../utils/pdfExport';
import { ACCENT_THEMES } from '../../utils/theme';
import { formatSessionDateTime } from './NextSessionCard';

export interface SessionPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeks: WeeklyBlock[];
  nextSessionAt: string | null;
  onSetNextSessionAt: (nextSessionAt: string | null) => void;
  sessionPrepNotes: string;
  onSetSessionPrepNotes: (notes: string) => void;
  onToggleDiscussed: (weekId: string, bulletId: string, discussed: boolean) => void;
  isOwner?: boolean;
  accentTheme?: AccentTheme;
}

export const SessionPrepModal: React.FC<SessionPrepModalProps> = ({
  isOpen,
  onClose,
  weeks,
  nextSessionAt,
  onSetNextSessionAt,
  sessionPrepNotes,
  onSetSessionPrepNotes,
  onToggleDiscussed,
  isOwner = true,
  accentTheme = 'amber',
}) => {
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showDiscussedHistory, setShowDiscussedHistory] = useState(false);

  if (!isOpen) return null;

  // Collect all tagged entries across weeks
  const toDiscussEntries: { weekId: string; weekTitle: string; bullet: BulletPoint }[] = [];
  const discussedEntries: { weekId: string; weekTitle: string; bullet: BulletPoint }[] = [];

  for (const week of weeks) {
    if (week.deletedAt) continue;
    for (const bullet of week.bullets || []) {
      if (bullet.deletedAt) continue;
      if (bullet.forSession) {
        if (!bullet.discussedAt) {
          toDiscussEntries.push({ weekId: week.id, weekTitle: week.weekTitle, bullet });
        } else {
          discussedEntries.push({ weekId: week.id, weekTitle: week.weekTitle, bullet });
        }
      }
    }
  }

  const handleStartEdit = () => {
    if (!isOwner) return;
    if (nextSessionAt) {
      try {
        const d = new Date(nextSessionAt);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          setDateTimeInput(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        } else {
          setDateTimeInput('');
        }
      } catch {
        setDateTimeInput('');
      }
    } else {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(14, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      setDateTimeInput(`${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}T14:00`);
    }
    setIsEditingDateTime(true);
  };

  const handleSaveDateTime = () => {
    if (!dateTimeInput) {
      onSetNextSessionAt(null);
    } else {
      const d = new Date(dateTimeInput);
      if (!isNaN(d.getTime())) {
        onSetNextSessionAt(d.toISOString());
      }
    }
    setIsEditingDateTime(false);
  };

  const handleExportPDF = () => {
    const allPrepItems = [
      ...toDiscussEntries.map((e) => ({
        id: e.bullet.id,
        text: e.bullet.text,
        timestamp: e.bullet.timestamp,
        weekTitle: e.weekTitle,
        discussed: false,
      })),
      ...discussedEntries.map((e) => ({
        id: e.bullet.id,
        text: e.bullet.text,
        timestamp: e.bullet.timestamp,
        weekTitle: e.weekTitle,
        discussed: true,
      })),
    ];

    exportSessionPrepToPDF({
      nextSessionAt,
      items: allPrepItems,
      notes: sessionPrepNotes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${currentAccent.bg500}`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Session Prep</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Prepare topics to discuss in your upcoming session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] p-2 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Next Session Date Card */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Next Session</span>
              </span>
              {isOwner && !isEditingDateTime && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{nextSessionAt ? 'Change' : 'Set date'}</span>
                </button>
              )}
            </div>

            {isEditingDateTime ? (
              <div className="space-y-2 pt-1">
                <input
                  type="datetime-local"
                  value={dateTimeInput}
                  onChange={(e) => setDateTimeInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center justify-end gap-2">
                  {nextSessionAt && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetNextSessionAt(null);
                        setIsEditingDateTime(false);
                      }}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingDateTime(false)}
                    className="px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDateTime}
                    className={`px-3 py-1 text-xs font-semibold text-white rounded-lg ${currentAccent.buttonPrimary}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {nextSessionAt ? formatSessionDateTime(nextSessionAt) : 'No session scheduled yet'}
              </p>
            )}
          </div>

          {/* Tagged Entries for Session */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Bring to session ({toDiscussEntries.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">
                Check off once discussed
              </span>
            </div>

            {toDiscussEntries.length === 0 ? (
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/30 border border-dashed border-stone-200 dark:border-stone-800 text-center">
                <p className="text-xs text-stone-400 dark:text-stone-500 italic">
                  No items tagged for this session yet.
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Tag entries using the "Bring to session" toggle chip on any entry or new reflection composer.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {toDiscussEntries.map(({ weekId, weekTitle, bullet }) => (
                  <div
                    key={bullet.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 border border-stone-200/80 dark:border-white/5 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleDiscussed(weekId, bullet.id, true)}
                      className="mt-0.5 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                      title="Mark as discussed"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-relaxed break-words whitespace-pre-wrap">
                        {bullet.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400 dark:text-stone-500 font-mono">
                        <span className="font-medium text-stone-500 dark:text-stone-400 truncate max-w-[150px]">
                          {weekTitle}
                        </span>
                        {bullet.timestamp && <span>· {bullet.timestamp}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Box: "Anything else to remember to say?" */}
          <div className="space-y-2 pt-1">
            <label className="block text-sm font-bold text-stone-900 dark:text-stone-100">
              Anything else to remember to say?
            </label>
            <textarea
              value={sessionPrepNotes}
              onChange={(e) => onSetSessionPrepNotes(e.target.value)}
              placeholder="e.g. Questions to ask, breakthroughs, updates on homework, thoughts that came up this week..."
              rows={4}
              className="w-full p-3 text-xs sm:text-sm leading-relaxed bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-white/10 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Discussed History Accordion */}
          {discussedEntries.length > 0 && (
            <div className="pt-2 border-t border-stone-200/80 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowDiscussedHistory(!showDiscussedHistory)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>
                  {showDiscussedHistory ? 'Hide' : 'Show'} discussed items ({discussedEntries.length})
                </span>
              </button>

              {showDiscussedHistory && (
                <div className="space-y-1.5 mt-2.5">
                  {discussedEntries.map(({ weekId, weekTitle, bullet }) => (
                    <div
                      key={bullet.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-100/60 dark:bg-stone-800/20 text-stone-500 dark:text-stone-400 border border-stone-200/40 dark:border-white/5"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleDiscussed(weekId, bullet.id, false)}
                        className="mt-0.5 text-emerald-600 dark:text-emerald-400 hover:text-stone-400 transition-colors shrink-0 cursor-pointer"
                        title="Unmark discussed"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs line-through truncate">
                          {bullet.text}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">
                          {weekTitle} · Discussed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900/30 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export as PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer ${currentAccent.buttonPrimary}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
