import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  ExternalLink as LinkIcon,
  FileDown,
  Maximize2,
  MessageSquare,
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
import { ACCENT_THEMES } from '../../utils/theme';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { HighlightText } from '../HighlightText';
import { LightboxMedia, MediaLightboxModal } from '../MediaLightboxModal';
import { AssignmentBox } from './AssignmentBox';
import { BulletItem } from './BulletItem';
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
  const isOwner = permissions.isOwner || currentUser?.role === 'owner';
  const canEdit = permissions.canEdit || (currentUser?.role === 'owner' || currentUser?.role === 'editor');
  const canDelete = permissions.canDelete || (currentUser?.role === 'owner' || currentUser?.role === 'editor');

  const themeConfig = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const [isJournalOpen, setIsJournalOpen] = useState(true);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newShowItemText, setNewShowItemText] = useState('');
  const [previewMedia, setPreviewMedia] = useState<LightboxMedia | null>(null);

  const [showWeeklyTimestampModal, setShowWeeklyTimestampModal] = useState(false);
  const updateWeeklyEntryTimestamp = useJournalStore((s) => s.updateWeeklyEntryTimestamp);

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
    (text: string, customTs: string | null, customIso: string | null) => {
      const finalTimestamp = customTs || formatTimestamp();
      const newBullet: BulletPoint = {
        id: 'b-' + Date.now(),
        text: text.trim(),
        indent: 0,
        bulletStyle: 'disc',
        timestamp: finalTimestamp,
        isoDate: customIso || undefined,
        isCustomDate: !!customTs,
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
      message: 'Delete this entry?',
      confirmText: 'Delete',
      onConfirm: () => {
        const bullets = week.bullets.filter((b) => b.id !== id);
        onUpdateWeek({ ...week, updatedAt: new Date().toISOString(), bullets });
      },
    });
  }, [confirmDelete, onUpdateWeek, week]);

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

  return (
    <div id={`week-card-${week.id}`} className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-xs overflow-visible mb-6">
      {/* Week Header */}
      <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              <HighlightText text={week.weekTitle} highlight={searchQuery} />
            </h2>
            <span className="text-[11px] font-mono text-stone-400">
              ({week.bullets.length} entries)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {(week.startDate || week.endDate) && (
              <p className="text-[11px] text-stone-400 font-mono">
                {week.startDate} – {week.endDate}
              </p>
            )}

            {/* Overarching Entry Header Timestamp */}
            <button
              type="button"
              onClick={() => canEdit && setShowWeeklyTimestampModal(true)}
              disabled={!canEdit}
              title={canEdit ? 'Click to edit overarching weekly entry timestamp' : `Created: ${parentFormattedTimestamp}`}
              className={`flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors ${
                canEdit ? 'cursor-pointer group' : 'cursor-default'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-mono text-[11px] underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-2 group-hover:decoration-amber-500">
                Created: {parentFormattedTimestamp}
              </span>
              {week.isCustomDate && (
                <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  Custom
                </span>
              )}
              {canEdit && (
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-stone-400 group-hover:text-amber-500 transition-opacity" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenCommentSection && (
            <button
              onClick={() => onOpenCommentSection('General', undefined, 'weekly', week.id)}
              title="Comments"
              className="min-h-[44px] min-w-[44px] p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center gap-1 text-xs"
            >
              <MessageSquare className="w-4 h-4" />
              {commentsCount > 0 && <span className="font-mono">{commentsCount}</span>}
            </button>
          )}

          <button
            onClick={() => exportWeekToPDF(week)}
            title="Export PDF"
            className="min-h-[44px] min-w-[44px] p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center"
          >
            <FileDown className="w-4 h-4" />
          </button>

          {isOwner && (
            <button
              onClick={() => {
                confirmDelete({
                  title: `Delete "${week.weekTitle}"?`,
                  message: `Delete this week and all entries inside it?`,
                  confirmText: 'Delete',
                  onConfirm: () => onDeleteWeek(),
                });
              }}
              className="min-h-[44px] min-w-[44px] p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors flex items-center justify-center"
              title="Delete Week"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Section 1: Journal Entries */}
        <div
          id="section-journal-bullets"
          className={`space-y-3 rounded-xl p-3.5 border transition-all ${
            isJournalHighlighted
              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-400 dark:border-blue-600'
              : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsJournalOpen(!isJournalOpen)}
              className="flex items-center gap-2 text-left cursor-pointer focus:outline-none"
            >
              {isJournalOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              )}
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Journal Entries
              </h3>
              <span className="text-[10px] font-mono text-stone-400">
                ({week.bullets.length})
              </span>
            </button>

            {onOpenCommentSection && (
              <button
                type="button"
                onClick={() => onOpenCommentSection('Journal Bullets', undefined, 'weekly', week.id)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                title="Comment"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isJournalOpen && (
            <div className="pt-1 space-y-2 animate-in fade-in duration-100">
              {/* Bullets */}
              <div className="space-y-1">
                {week.bullets.length === 0 ? (
                  <p className="text-xs text-stone-400 py-2 text-center">
                    No entries yet
                  </p>
                ) : (
                  week.bullets.map((bullet) => (
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

        {/* Section 2: Therapist Highlights & Media */}
        <div
          id="section-therapist-notes"
          className={`rounded-xl p-3.5 border space-y-3 transition-all ${
            isTherapistHighlighted
              ? `${themeConfig.iconBoxSelected} ${themeConfig.activeBorder}`
              : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Sparkles className={`w-3.5 h-3.5 ${themeConfig.textPrimary}`} />
              <span>{week.therapistSection.title || 'Session Notes'}</span>
            </h3>

            {onOpenCommentSection && (
              <button
                type="button"
                onClick={() => onOpenCommentSection('Therapist Notes', undefined, 'weekly', week.id)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
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
                  className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 px-2.5 py-1 rounded-lg text-xs"
                >
                  <LinkIcon className={`w-3 h-3 shrink-0 ${themeConfig.textPrimary}`} />
                  <a
                    href={sanitizeUrl(link.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-stone-800 dark:text-stone-200 hover:underline truncate max-w-[140px]"
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
                    className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteExternalLink(link.id)}
                      className="text-stone-400 hover:text-rose-500 font-bold px-0.5"
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
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="URL (Apple Photos / Media)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                />
                <button
                  onClick={handleAddExternalLink}
                  className="min-h-[40px] px-3.5 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-stone-800 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center"
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Items to show */}
          <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
            <div className="space-y-1">
              {week.therapistSection.itemsToShow.map((item) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                    item.isHighlightedAnswer
                      ? themeConfig.tagBadge
                      : 'bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-stone-100'
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
                            : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                        }`}
                      >
                        Highlight
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteShowItem(item.id)}
                        className="min-h-[32px] min-w-[32px] p-1 flex items-center justify-center text-stone-400 hover:text-rose-500"
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
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                />
                <button
                  onClick={handleAddShowItem}
                  className="min-h-[40px] px-3.5 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-stone-800 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center"
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
    </div>
  );
});

interface QuickAddBulletFormProps {
  onAdd: (text: string, customTs: string | null, customIso: string | null) => void;
  buttonPrimaryClass: string;
}

const QuickAddBulletForm: React.FC<QuickAddBulletFormProps> = React.memo(
  ({ onAdd, buttonPrimaryClass }) => {
    const [text, setText] = useState('');
    const [customTs, setCustomTs] = useState<string | null>(null);
    const [customIso, setCustomIso] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSubmit = () => {
      if (!text.trim()) return;
      onAdd(text.trim(), customTs, customIso);
      setText('');
      setCustomTs(null);
      setCustomIso(null);
      setShowDatePicker(false);
    };

    return (
      <div className="pt-1 space-y-1.5">
        {customTs && (
          <div className="flex items-center justify-between text-[11px] px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/60 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>
                Backdating entry to: <strong>{customTs}</strong>
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomTs(null);
                setCustomIso(null);
              }}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`relative flex-1 ${showDatePicker ? 'z-[9999]' : 'z-10'}`}>
            <input
              type="text"
              placeholder={customTs ? 'New reflection for custom date...' : 'New reflection...'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full pl-3 pr-11 py-2.5 sm:py-2 text-base sm:text-xs min-h-[44px] sm:min-h-[38px] bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />

            {/* Custom Date / Time Button */}
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              title="Set custom/backdated date before creating entry"
              aria-label="Set custom or backdated timestamp"
              className={`absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all flex items-center justify-center ${
                customTs
                  ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/50'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>

            {/* Date Picker Popover */}
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
              />
            )}
          </div>

          <button
            onClick={handleSubmit}
            className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 shrink-0 ${buttonPrimaryClass}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    );
  }
);
