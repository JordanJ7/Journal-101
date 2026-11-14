import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  ExternalLink as LinkIcon,
  FileDown,
  GitMerge,
  Maximize2,
  MessageSquare,
  MoreVertical,
  Pin,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import { useJournalStore } from '../../store/useJournalStore';
import { AccentTheme, AssignmentSwitches, BulletPoint, ExternalLink, WeeklyBlock } from '../../types';
import { exportWeekToPDF } from '../../utils/pdfExport';
import { sanitizeUrl } from '../../utils/security';
import { formatTimestamp, parseDateFromTimestamp } from '../../utils/storage';
import { formatWeekDateRange, isCurrentWeek } from '../../utils/dateUtils';
import { formatReminder } from '../../utils/reminderTime';
import { ACCENT_THEMES } from '../../utils/theme';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { ReminderPicker } from '../ReminderControls';
import { LogRow, SessionPanel, WeekStrip } from './LogParts';
import { HighlightText } from '../HighlightText';
import { LightboxMedia, MediaLightboxModal } from '../MediaLightboxModal';
import { AssignmentBox } from './AssignmentBox';
import { BulletItem } from './BulletItem';
import { MergeWeekModal } from './MergeWeekModal';
import { TimestampPickerPopover } from './TimestampPickerPopover';
import { WeeklyTimestampModal } from './WeeklyTimestampModal';
import { usePermissions } from '../../hooks/usePermissions';

interface WeekCardProps {
  week: WeeklyBlock;
  onUpdateWeek: (updated: WeeklyBlock) => void;
  onDeleteWeek: () => void;
  accentTheme?: AccentTheme;
  currentUser: CurrentUserProfile;
  commentsCount?: number;
  onOpenCommentSection?: (sectionTag?: string, itemId?: string, targetType?: 'weekly' | 'core', targetId?: string) => void;
  activeCommentSectionTag?: string;
  onTogglePinTakeaway?: (bullet: BulletPoint, week: WeeklyBlock) => void;
  searchQuery?: string;
}

export const WeekCard: React.FC<WeekCardProps> = React.memo(({
  week,
  onUpdateWeek,
  onDeleteWeek,
  accentTheme = 'amber',
  currentUser,
  commentsCount = 0,
  onOpenCommentSection,
  activeCommentSectionTag,
  onTogglePinTakeaway,
  searchQuery,
}) => {
  const permissions = usePermissions();
  const isOwner = permissions.isOwner;
  const canEdit = permissions.canEdit;
  const canDelete = permissions.canDelete;

  const themeConfig = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const [isJournalOpen, setIsJournalOpen] = useState(true);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newShowItemText, setNewShowItemText] = useState('');
  const [previewMedia, setPreviewMedia] = useState<LightboxMedia | null>(null);

  const [showWeeklyTimestampModal, setShowWeeklyTimestampModal] = useState(false);
  const updateWeeklyEntryTimestamp = useJournalStore((s) => s.updateWeeklyEntryTimestamp);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const mergeWeekInto = useJournalStore((s) => s.mergeWeekInto);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);

  const activeBullets = (week.bullets || []).filter((b) => !b.deletedAt);

  const parentDate = parseDateFromTimestamp(week.createdAt || week.startDate || week.weekTitle);
  const parentFormattedTimestamp = week.timestamp || formatTimestamp(parentDate);

  const isJournalHighlighted =
    activeCommentSectionTag === 'Journal Bullets' ||
    activeCommentSectionTag?.toLowerCase().includes('bullet') ||
    activeCommentSectionTag?.toLowerCase().includes('journal');

  const isTherapistHighlighted =
    activeCommentSectionTag === 'Therapist Notes' ||
    activeCommentSectionTag?.toLowerCase().includes('therapist') ||
    activeCommentSectionTag?.toLowerCase().includes('show des');

  // Bullet Handlers
  const handleAddBulletSubmit = useCallback(
    (text: string, customTs: string | null, customIso: string | null, forSession?: boolean, remindAt?: string | null) => {
      const finalTimestamp = customTs || formatTimestamp();
      const newBullet: BulletPoint = {
        id: 'b-' + Date.now(),
        text: text.trim(),
        indent: 0,
        bulletStyle: 'disc',
        timestamp: finalTimestamp,
        isoDate: customIso || undefined,
        isCustomDate: !!customTs,
        forSession: !!forSession,
        ...(remindAt ? { remindAt, completed: false } : {}),
      };

      // If custom backdated date was picked, use store helper which auto-places in the right week & sorts chronologically
      if (customTs) {
        const updateBulletTimestamp = useJournalStore.getState().updateBulletTimestamp;
        onUpdateWeek({
          ...week,
          updatedAt: new Date().toISOString(),
          bullets: [...week.bullets, newBullet],
        });
        setTimeout(() => {
          updateBulletTimestamp(
            week.id,
            newBullet.id,
            finalTimestamp,
            customIso || undefined,
            true
          );
        }, 0);
      } else {
        onUpdateWeek({
          ...week,
          updatedAt: new Date().toISOString(),
          bullets: [...week.bullets, newBullet],
        });
      }
    },
    [onUpdateWeek, week]
  );

  // Drag reminders (or any text) from another app in Split View onto the entries list to add
  // them. Each line becomes its own entry. Drops into a text field are left to the browser, which
  // inserts the text there as usual.
  const [isDropTarget, setIsDropTarget] = useState(false);
  const isEditableTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('textarea, input, [contenteditable="true"]');
  const hasDroppableText = (e: React.DragEvent) =>
    canEdit && !isEditableTarget(e.target) && Array.from(e.dataTransfer.types).includes('text/plain');

  const handleEntriesDragOver = useCallback((e: React.DragEvent) => {
    if (!hasDroppableText(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropTarget(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const handleEntriesDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDropTarget(false);
  }, []);

  const handleEntriesDrop = useCallback((e: React.DragEvent) => {
    setIsDropTarget(false);
    if (!hasDroppableText(e)) return;
    e.preventDefault();
    const lines = parseDroppedLines(e.dataTransfer.getData('text/plain'));
    if (lines.length === 0) return;
    const now = Date.now();
    const timestamp = formatTimestamp();
    const added: BulletPoint[] = lines.map((text, i) => ({
      id: `b-${now}-${i}`,
      text,
      indent: 0,
      bulletStyle: 'disc',
      timestamp,
      isCustomDate: false,
      forSession: false,
    }));
    onUpdateWeek({ ...week, updatedAt: new Date().toISOString(), bullets: [...week.bullets, ...added] });
    setIsJournalOpen(true);
    useJournalStore.getState().showToast(`Added ${added.length} ${added.length === 1 ? 'entry' : 'entries'}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, onUpdateWeek, week]);

  const { confirmDelete } = useConfirmDelete();

  const handleUpdateBullet = useCallback((updated: BulletPoint) => {
    // If timestamp was modified, call store's updateBulletTimestamp for auto-sorting / cross-week relocation
    const existingBullet = week.bullets.find((b) => b.id === updated.id);
    if (existingBullet && existingBullet.timestamp !== updated.timestamp) {
      useJournalStore.getState().updateBulletTimestamp(
        week.id,
        updated.id,
        updated.timestamp,
        updated.isoDate,
        updated.isCustomDate
      );
      return;
    }

    const bullets = week.bullets.map((b) => (b.id === updated.id ? updated : b));
    onUpdateWeek({ ...week, updatedAt: new Date().toISOString(), bullets });
  }, [onUpdateWeek, week]);

  const handleDeleteBullet = useCallback((id: string) => {
    confirmDelete({
      title: 'Delete Entry',
      message: 'Delete this entry? It will be moved to Recently Deleted.',
      confirmText: 'Delete',
      onConfirm: () => {
        deleteEntry(week.id, id);
      },
    });
  }, [confirmDelete, deleteEntry, week.id]);

  const handleIndentChange = useCallback((id: string, newIndent: number) => {
    const bullets = week.bullets.map((b) => (b.id === id ? { ...b, indent: newIndent } : b));
    onUpdateWeek({ ...week, updatedAt: new Date().toISOString(), bullets });
  }, [onUpdateWeek, week]);

  // Assignment Switch Handlers
  const handleUpdateAssignments = useCallback((assignments: AssignmentSwitches) => {
    onUpdateWeek({ ...week, updatedAt: new Date().toISOString(), assignments });
  }, [onUpdateWeek, week]);

  // External Link Handlers
  const handleAddExternalLink = useCallback(() => {
    if (!newLinkUrl.trim()) return;
    const newLink: ExternalLink = {
      id: 'link-' + Date.now(),
      title: newLinkTitle.trim() || 'Media Album',
      url: newLinkUrl.trim(),
    };
    onUpdateWeek({
      ...week,
      updatedAt: new Date().toISOString(),
      therapistSection: {
        ...week.therapistSection,
        externalLinks: [...week.therapistSection.externalLinks, newLink],
      },
    });
    setNewLinkTitle('');
    setNewLinkUrl('');
  }, [newLinkTitle, newLinkUrl, onUpdateWeek, week]);

  const handleDeleteExternalLink = useCallback((id: string) => {
    confirmDelete({
      title: 'Remove Link',
      message: 'Remove this album link?',
      confirmText: 'Remove',
      onConfirm: () => {
        onUpdateWeek({
          ...week,
          therapistSection: {
            ...week.therapistSection,
            externalLinks: week.therapistSection.externalLinks.filter((l) => l.id !== id),
          },
        });
      },
    });
  }, [confirmDelete, onUpdateWeek, week]);

  // Things to Show Handlers
  const handleAddShowItem = useCallback(() => {
    if (!newShowItemText.trim()) return;
    const newItem = {
      id: 'item-' + Date.now(),
      text: newShowItemText.trim(),
      timestamp: formatTimestamp(),
      isHighlightedAnswer: false,
    };
    onUpdateWeek({
      ...week,
      updatedAt: new Date().toISOString(),
      therapistSection: {
        ...week.therapistSection,
        itemsToShow: [...week.therapistSection.itemsToShow, newItem],
      },
    });
    setNewShowItemText('');
  }, [newShowItemText, onUpdateWeek, week]);

  const toggleShowItemHighlight = useCallback((id: string) => {
    const items = week.therapistSection.itemsToShow.map((item) => {
      if (item.id === id) {
        return { ...item, isHighlightedAnswer: !item.isHighlightedAnswer };
      }
      return item;
    });
    onUpdateWeek({
      ...week,
      therapistSection: {
        ...week.therapistSection,
        itemsToShow: items,
      },
    });
  }, [onUpdateWeek, week]);

  const handleDeleteShowItem = useCallback((id: string) => {
    confirmDelete({
      title: 'Delete Item',
      message: 'Delete this item?',
      confirmText: 'Delete',
      onConfirm: () => {
        onUpdateWeek({
          ...week,
          therapistSection: {
            ...week.therapistSection,
            itemsToShow: week.therapistSection.itemsToShow.filter((i) => i.id !== id),
          },
        });
      },
    });
  }, [confirmDelete, onUpdateWeek, week]);

  const togglePinWeek = useJournalStore((s) => s.togglePinWeek);

  const handleTogglePin = useCallback(() => {
    if (!canEdit) return;
    if (togglePinWeek) {
      togglePinWeek(week.id);
    } else {
      onUpdateWeek({
        ...week,
        isPinned: !week.isPinned,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [canEdit, togglePinWeek, onUpdateWeek, week]);

  const isCurrent = isCurrentWeek(week);

  return (
    <div id={`week-card-${week.id}`} className="text-(--j-ink) mb-6">
      {/* Week header: the week, its actions, the day as the hero, and the strip */}
      <header className="mb-1">
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          <p className="text-[13px] leading-4 font-semibold text-(--j-ink2) m-0 flex items-center gap-2 min-w-0">
            <span className="truncate">
              <HighlightText text={`Week of ${formatWeekDateRange(week.startDate, week.endDate)}`} highlight={searchQuery} />
              {` · ${activeBullets.length} ${activeBullets.length === 1 ? 'entry' : 'entries'}`}
            </span>
            {week.isPinned && <Pin className="w-3.5 h-3.5 fill-current shrink-0" aria-label="Pinned" />}
          </p>
        <div className="flex items-center gap-1">
            {canEdit && (
              <button
                type="button"
                onClick={handleTogglePin}
                title={week.isPinned ? 'Unpin week (currently pinned to top)' : 'Pin week to top'}
                aria-label={week.isPinned ? 'Unpin week' : 'Pin week'}
                className={`min-h-[44px] min-w-[44px] p-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs ${
                  week.isPinned
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-(--j-ink2) hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Pin className={`w-4 h-4 ${week.isPinned ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline font-medium">
                  {week.isPinned ? 'Pinned' : 'Pin'}
                </span>
              </button>
            )}
  
            {onOpenCommentSection && (
              <button
                onClick={() => onOpenCommentSection('General', undefined, 'weekly', week.id)}
                title="Comments"
                className="min-h-[44px] min-w-[44px] p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center gap-1 text-xs"
              >
                <MessageSquare className="w-4 h-4" />
                {commentsCount > 0 && <span className="tabular-nums">{commentsCount}</span>}
              </button>
            )}
  
            <button
              onClick={() => exportWeekToPDF(week)}
              title="Export PDF"
              className="min-h-[44px] min-w-[44px] p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center"
            >
              <FileDown className="w-4 h-4" />
            </button>
  
            {canEdit && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  className="min-h-[44px] min-w-[44px] p-2 text-(--j-ink2) hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                  title="More week options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 bg-(--j-field) rounded-xl shadow-xl border border-(--j-line) p-1 min-w-[160px] text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setIsMergeModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 text-stone-700 dark:text-stone-200 cursor-pointer"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-amber-500" />
                        <span>Merge into…</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowWeeklyTimestampModal(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 text-stone-700 dark:text-stone-200 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Change week date…</span>
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            confirmDelete({
                              title: `Delete "${week.weekTitle}"?`,
                              message: `Delete this week and all entries inside it?`,
                              confirmText: 'Delete',
                              onConfirm: () => onDeleteWeek(),
                            });
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Week</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <h1 className="j-display text-[46px] sm:text-[58px] leading-[1.02] mt-1 mb-4 break-words">
          {isCurrent ? new Date().toLocaleDateString([], { weekday: 'long' }) : formatWeekDateRange(week.startDate, week.endDate)}
        </h1>
        <WeekStrip week={week} bullets={activeBullets} />
      </header>

      <div className="xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-12">
        <div className="min-w-0">
        {/* Section 1: Journal Entries */}
        <div
          id="section-journal-bullets"
          onDragOver={handleEntriesDragOver}
          onDragLeave={handleEntriesDragLeave}
          onDrop={handleEntriesDrop}
          className={`transition-all rounded-2xl ${
            isDropTarget
              ? 'outline-2 outline-dashed outline-offset-4 outline-(--j-tag) bg-(--j-chip)'
              : isJournalHighlighted
              ? 'outline-2 outline-offset-4 outline-(--j-tag)'
              : ''
          }`}
        >
          {isJournalOpen && (
            <div>
              {/* Entries, newest first */}
              <div>
                {activeBullets.length === 0 ? (
                  <p className="text-[15px] text-(--j-ink2) py-6">
                    Nothing yet this week. Write the first line below.
                  </p>
                ) : (
                  [...activeBullets].reverse().map((bullet) => (
                    <LogRow
                      key={bullet.id}
                      bullet={bullet}
                      expanded={openEntryId === bullet.id}
                      onToggle={() => setOpenEntryId(openEntryId === bullet.id ? null : bullet.id)}
                      onToggleComplete={canEdit ? () => handleUpdateBullet({ ...bullet, completed: !bullet.completed }) : undefined}
                      searchQuery={searchQuery}
                    >
                    <BulletItem
                      key={bullet.id}
                      bullet={bullet}
                      weekId={week.id}
                      accentTheme={accentTheme}
                      onUpdate={handleUpdateBullet}
                      onDelete={() => handleDeleteBullet(bullet.id)}
                      onIndentChange={(newIndent) => handleIndentChange(bullet.id, newIndent)}
                      onTogglePinTakeaway={onTogglePinTakeaway ? (b) => onTogglePinTakeaway(b, week) : undefined}
                      onPreviewMedia={setPreviewMedia}
                      onOpenCommentSection={onOpenCommentSection}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      searchQuery={searchQuery}
                    />
                    </LogRow>
                  ))
                )}
              </div>

              {/* Add Bullet Input & Backdating Trigger */}
              {canEdit && (
                <QuickAddBulletForm
                  onAdd={handleAddBulletSubmit}
                  buttonPrimaryClass={themeConfig.buttonPrimary}
                />
              )}
            </div>
          )}
        </div>

        </div>
        <aside className="mt-10 xl:mt-1 space-y-6 min-w-0">
        <SessionPanel />

        {/* Section 2: Therapist Highlights & Media */}
        <div
          id="section-therapist-notes"
          className={`rounded-xl p-3.5 border space-y-3 transition-all ${
            isTherapistHighlighted
              ? `${themeConfig.iconBoxSelected} ${themeConfig.activeBorder}`
              : 'bg-(--j-soft) border-(--j-line)'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-(--j-ink) flex items-center gap-1.5">
              <Sparkles className={`w-3.5 h-3.5 ${themeConfig.textPrimary}`} />
              <span>{week.therapistSection.title || 'Session Notes'}</span>
            </h3>

            {onOpenCommentSection && (
              <button
                type="button"
                onClick={() => onOpenCommentSection('Therapist Notes', undefined, 'weekly', week.id)}
                className="p-1 text-(--j-ink2) hover:text-stone-700 dark:hover:text-stone-200"
                title="Comment"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* External Links */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {week.therapistSection.externalLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-1.5 bg-(--j-field) border border-(--j-line) px-2.5 py-1 rounded-lg text-xs"
                >
                  <LinkIcon className={`w-3 h-3 shrink-0 ${themeConfig.textPrimary}`} />
                  <a
                    href={sanitizeUrl(link.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-(--j-ink) hover:underline truncate max-w-[140px]"
                  >
                    <HighlightText text={link.title} highlight={searchQuery} />
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewMedia({
                        url: link.url,
                        title: link.title,
                        categoryLabel: 'Shared Media',
                        sourceTitle: week.weekTitle,
                        externalUrl: link.url,
                      })
                    }
                    className="p-0.5 text-(--j-ink2) hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteExternalLink(link.id)}
                      className="text-(--j-ink2) hover:text-rose-500 font-bold px-0.5"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Link Title"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-(--j-field) border border-(--j-line) rounded-xl text-(--j-ink) placeholder-stone-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="URL (Apple Photos / Media)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-(--j-field) border border-(--j-line) rounded-xl text-(--j-ink) placeholder-stone-400 focus:outline-none"
                />
                <button
                  onClick={handleAddExternalLink}
                  className="min-h-[40px] px-3.5 py-2 bg-(--j-soft) hover:bg-black/10 dark:hover:bg-white/15 text-(--j-ink) font-semibold text-xs rounded-xl transition-colors flex items-center justify-center"
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Items to show */}
          <div className="space-y-1.5 pt-2 border-t border-(--j-line)">
            <div className="space-y-1">
              {week.therapistSection.itemsToShow.map((item) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                    item.isHighlightedAnswer
                      ? themeConfig.tagBadge
                      : 'bg-(--j-field) text-(--j-ink)'
                  }`}
                >
                  <p className="truncate flex-1 font-medium">
                    <HighlightText text={item.text} highlight={searchQuery} />
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => toggleShowItemHighlight(item.id)}
                        className={`text-[10px] px-2 py-1 rounded-lg font-semibold ${
                          item.isHighlightedAnswer
                            ? `${themeConfig.bg500} text-white`
                            : 'text-(--j-ink2) hover:text-stone-700 dark:hover:text-stone-200'
                        }`}
                      >
                        Highlight
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteShowItem(item.id)}
                        className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center text-(--j-ink2) hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Note / highlight..."
                  value={newShowItemText}
                  onChange={(e) => setNewShowItemText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddShowItem()}
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-(--j-field) border border-(--j-line) rounded-xl text-(--j-ink) placeholder-stone-400 focus:outline-none"
                />
                <button
                  onClick={handleAddShowItem}
                  className="min-h-[40px] px-3.5 py-2 bg-(--j-soft) hover:bg-black/10 dark:hover:bg-white/15 text-(--j-ink) font-semibold text-xs rounded-xl transition-colors flex items-center justify-center"
                >
                  + Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Tasks & Assignments */}
        <AssignmentBox
          assignments={week.assignments}
          onUpdate={handleUpdateAssignments}
          canEdit={canEdit}
          canDelete={canDelete}
          onOpenCommentSection={onOpenCommentSection}
          activeCommentSectionTag={activeCommentSectionTag}
          searchQuery={searchQuery}
          accentTheme={accentTheme}
        />
        </aside>
      </div>

      <MediaLightboxModal media={previewMedia} onClose={() => setPreviewMedia(null)} />

      {/* Global Overarching Timestamp Modal */}
      {showWeeklyTimestampModal && (
        <WeeklyTimestampModal
          isOpen={showWeeklyTimestampModal}
          onClose={() => setShowWeeklyTimestampModal(false)}
          currentCreatedAt={week.createdAt || week.startDate}
          weekTitle={week.weekTitle}
          onSave={async (newIso, newFormatted) => {
            await updateWeeklyEntryTimestamp(week.id, newFormatted, newIso);
          }}
        />
      )}

      {/* Merge Week Modal */}
      {isMergeModalOpen && (
        <MergeWeekModal
          isOpen={isMergeModalOpen}
          sourceWeek={week}
          onClose={() => setIsMergeModalOpen(false)}
          onConfirmMerge={(targetWeekId) => {
            mergeWeekInto(week.id, targetWeekId);
            setIsMergeModalOpen(false);
          }}
        />
      )}
    </div>
  );
});

interface QuickAddBulletFormProps {
  onAdd: (text: string, customTs: string | null, customIso: string | null, forSession?: boolean, remindAt?: string | null) => void;
  buttonPrimaryClass: string;
}

const QuickAddBulletForm: React.FC<QuickAddBulletFormProps> = React.memo(
  ({ onAdd, buttonPrimaryClass }) => {
    const [text, setText] = useState('');
    const [customTs, setCustomTs] = useState<string | null>(null);
    const [customIso, setCustomIso] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [forSession, setForSession] = useState(false);
    const [showReminder, setShowReminder] = useState(false);
    const [remindAt, setRemindAt] = useState<string | null>(null);

    const handleSubmit = () => {
      if (!text.trim()) return;
      onAdd(text.trim(), customTs, customIso, forSession, remindAt);
      setText('');
      setCustomTs(null);
      setCustomIso(null);
      setShowDatePicker(false);
      setForSession(false);
      setRemindAt(null);
      setShowReminder(false);
    };

    return (
      <div className="[@media(min-height:600px)]:sticky [@media(min-height:600px)]:bottom-[-5rem] md:[@media(min-height:600px)]:bottom-[-2rem] z-20 mt-3 pt-5 pb-3 md:pb-4 bg-gradient-to-t from-(--j-ground) from-80% to-transparent [@media(min-height:600px)]:after:content-[''] after:absolute after:inset-x-0 after:top-full after:h-16 after:bg-(--j-ground)">
        {customTs && (
          <div className="flex items-center justify-between gap-2 text-[12px] mb-2 px-3 py-1.5 rounded-xl bg-(--j-chip) text-(--j-tag) font-semibold">
            <span className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Dated {customTs}</span>
            </span>
            <button type="button" onClick={() => { setCustomTs(null); setCustomIso(null); }} className="flex items-center gap-0.5 shrink-0 min-h-[32px]">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        )}

        <div className={`relative flex items-end gap-1 rounded-[28px] bg-(--j-field) border border-(--j-fieldline) pl-5 pr-1.5 py-1.5 ${showDatePicker ? 'z-[9999]' : ''}`}>
          <textarea
            rows={1}
            aria-label="New entry"
            placeholder="Log a thought"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            className="flex-1 min-w-0 resize-none bg-transparent py-[11px] text-[17px] leading-[22px] text-(--j-ink) placeholder:text-(--j-ink2) focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowReminder(!showReminder)}
            aria-pressed={!!remindAt}
            aria-label={remindAt ? `Reminder ${formatReminder(remindAt)}` : 'Add a reminder'}
            title="Add a reminder with an alarm"
            className={`shrink-0 w-11 h-11 rounded-full grid place-items-center ${remindAt ? 'bg-(--j-chip) text-(--j-tag)' : 'text-(--j-ink2) hover:text-(--j-ink)'}`}
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            aria-label="Set a custom or backdated time"
            title="Backdate this entry"
            className={`shrink-0 w-11 h-11 rounded-full grid place-items-center ${customTs ? 'bg-(--j-chip) text-(--j-tag)' : 'text-(--j-ink2) hover:text-(--j-ink)'}`}
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim()}
            aria-label="Add entry"
            className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-(--j-sig) text-(--j-onsig) disabled:opacity-40 active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </button>

          {showDatePicker && (
            <TimestampPickerPopover
              currentTimestamp={customTs || formatTimestamp()}
              isoDate={customIso || undefined}
              onSave={(timestamp, iso) => {
                setCustomTs(timestamp);
                setCustomIso(iso);
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
              title="Backdate New Entry"
              align="right"
              placement="above"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 px-1">
          <button
            type="button"
            onClick={() => setForSession(!forSession)}
            aria-pressed={forSession}
            className={`min-h-[32px] px-3 rounded-full text-[13px] font-semibold flex items-center gap-1.5 ${
              forSession ? 'bg-(--j-sig) text-(--j-onsig)' : 'text-(--j-ink2) border border-(--j-fieldline)'
            }`}
            title="Tag to bring up in your next session"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            For session
          </button>
          {remindAt && (
            <span className="min-h-[32px] px-3 rounded-full text-[13px] font-semibold flex items-center gap-1.5 bg-(--j-chip) text-(--j-tag)">
              <Bell className="w-3.5 h-3.5" />{formatReminder(remindAt)}
            </span>
          )}
        </div>
        {showReminder && <div className="mt-2"><ReminderPicker value={remindAt} onChange={setRemindAt} /></div>}
      </div>
    );
  }
);

/** Splits dropped text into entry lines, removing list markers such as "- [ ]", "•" or "1.". */
function parseDroppedLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•◦○☐☑✓]|\d+[.)](?=\s))?\s*(?:\[[ xX]?\])?\s*/, '')
        .trim()
    )
    .filter((line) => line.length > 0);
}
