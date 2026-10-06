import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Trash2,
  Calendar,
  FileText,
  Folder,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';
import { WeeklyBlock, BulletPoint, CoreCategoryConfig, CoreTopicItem } from '../types';

interface RecentlyDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'weeks' | 'entries' | 'folders' | 'notes';

export const RecentlyDeletedModal: React.FC<RecentlyDeletedModalProps> = ({
  isOpen,
  onClose,
}) => {
  const weeks = useJournalStore((s) => s.weeks);
  const coreCategories = useJournalStore((s) => s.coreCategories);
  const coreItems = useJournalStore((s) => s.coreItems);
  const restoreItem = useJournalStore((s) => s.restoreItem);
  const permanentlyDeleteItem = useJournalStore((s) => s.permanentlyDeleteItem);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    type: 'week' | 'entry' | 'folder' | 'note';
    id: string;
    parentId?: string;
    title: string;
  } | null>(null);

  if (!isOpen) return null;

  // Gather deleted items
  const deletedWeeks: WeeklyBlock[] = weeks.filter((w) => !!w.deletedAt);

  const deletedEntries: { bullet: BulletPoint; weekId: string; weekTitle: string }[] = [];
  weeks.forEach((w) => {
    (w.bullets || []).forEach((b) => {
      if (b.deletedAt) {
        deletedEntries.push({
          bullet: b,
          weekId: w.id,
          weekTitle: w.weekTitle,
        });
      }
    });
  });

  const deletedFolders: CoreCategoryConfig[] = coreCategories.filter((c) => !!c.deletedAt);
  const deletedNotes: CoreTopicItem[] = coreItems.filter((i) => !!i.deletedAt);

  const totalCount =
    deletedWeeks.length +
    deletedEntries.length +
    deletedFolders.length +
    deletedNotes.length;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!confirmDeleteTarget) return;
    await permanentlyDeleteItem(
      confirmDeleteTarget.type,
      confirmDeleteTarget.id,
      confirmDeleteTarget.parentId
    );
    setConfirmDeleteTarget(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recently-deleted-title"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <h2 id="recently-deleted-title" className="text-base font-bold">Recently Deleted</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              Items are kept for 30 days before permanent deletion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recently deleted dialog"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-black/5 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weeks')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'weeks'
                ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Weeks ({deletedWeeks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'entries'
                ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Journal Entries ({deletedEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('folders')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'folders'
                ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Folders ({deletedFolders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Topic Notes ({deletedNotes.length})
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {totalCount === 0 ? (
            <div className="text-center py-12 text-stone-400 dark:text-stone-500">
              <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No recently deleted items</p>
              <p className="text-xs text-stone-400 mt-1">
                Deleted items will appear here for 30 days before permanent deletion.
              </p>
            </div>
          ) : (
            <>
              {/* Weeks Group */}
              {(activeTab === 'all' || activeTab === 'weeks') && deletedWeeks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Weeks ({deletedWeeks.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {deletedWeeks.map((week) => (
                      <div
                        key={week.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-xs font-bold truncate">{week.weekTitle}</p>
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            {week.startDate} {week.endDate && `– ${week.endDate}`} · {week.bullets?.length || 0} entries · Deleted {formatDate(week.deletedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => restoreItem('week', week.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteTarget({
                                type: 'week',
                                id: week.id,
                                title: week.weekTitle,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete forever</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal Entries Group */}
              {(activeTab === 'all' || activeTab === 'entries') && deletedEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Journal Entries ({deletedEntries.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {deletedEntries.map(({ bullet, weekId, weekTitle }) => (
                      <div
                        key={bullet.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-xs font-medium text-stone-800 dark:text-stone-200 line-clamp-2">
                            {bullet.text || '(Empty entry)'}
                          </p>
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            From: {weekTitle} · Deleted {formatDate(bullet.deletedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => restoreItem('entry', bullet.id, weekId)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteTarget({
                                type: 'entry',
                                id: bullet.id,
                                parentId: weekId,
                                title: bullet.text.slice(0, 30) || 'Entry',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete forever</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Folders Group */}
              {(activeTab === 'all' || activeTab === 'folders') && deletedFolders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <Folder className="w-3.5 h-3.5" />
                    <span>Topic Folders ({deletedFolders.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {deletedFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-xs font-bold truncate">{folder.title}</p>
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            Deleted {formatDate(folder.deletedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => restoreItem('folder', folder.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteTarget({
                                type: 'folder',
                                id: folder.id,
                                title: folder.title,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete forever</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Notes Group */}
              {(activeTab === 'all' || activeTab === 'notes') && deletedNotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Topic Notes ({deletedNotes.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {deletedNotes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-xs font-bold truncate">{note.title || 'Untitled Note'}</p>
                          {note.content && (
                            <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-1 mt-0.5">
                              {note.content}
                            </p>
                          )}
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            Deleted {formatDate(note.deletedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => restoreItem('note', note.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteTarget({
                                type: 'note',
                                id: note.id,
                                title: note.title || 'Note',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete forever</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmDeleteTarget && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setConfirmDeleteTarget(null)}
          >
            <div
              className="bg-white dark:bg-[#1C1C1E] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-stone-900 dark:text-stone-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold">Delete Forever?</h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold">"{confirmDeleteTarget.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPermanentDelete}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
