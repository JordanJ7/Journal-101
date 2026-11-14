import {
  ArrowRightLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  CornerDownRight,
  Edit2,
  Edit3,
  Eye,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Play,
  Plus,
  Reply,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJournalStore } from '../../store/useJournalStore';
import { ReminderChip, ReminderPicker } from '../ReminderControls';
import { AccentTheme, Attachment, BulletPoint } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { formatTimestamp, parseDateFromTimestamp } from '../../utils/storage';
import { HighlightText } from '../HighlightText';
import { TimestampPickerPopover } from './TimestampPickerPopover';
import { MediaInspectModal } from '../MediaInspectModal';
import { SaveStatusBadge } from '../SaveStatusBadge';
import { MoveEntryModal } from './MoveEntryModal';
import { AutoGrowTextarea } from '../AutoGrowTextarea';
import {
  createAttachmentFromUrl,
  filesToPersistentAttachments,
  getNormalizedAttachments,
  isPdfMedia,
  isVideoMedia,
} from '../../utils/mediaUtils';
import { LightboxMedia } from '../MediaLightboxModal';

function formatCommentWeekday(timestampStr?: string): string {
  if (!timestampStr) return 'Fri';
  const parsed = parseDateFromTimestamp(timestampStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (parsed && !isNaN(parsed.getTime())) {
    return days[parsed.getDay()];
  }
  const d = new Date(timestampStr);
  if (!isNaN(d.getTime())) {
    return days[d.getDay()];
  }
  return 'Fri';
}

export interface JournalEntryCardProps {
  bullet: BulletPoint;
  onUpdate: (updated: BulletPoint) => void;
  onDelete: () => void;
  onIndentChange: (newIndent: number) => void;
  onTogglePinTakeaway?: (bullet: BulletPoint) => void;
  onPreviewMedia?: (media: LightboxMedia) => void;
  onOpenCommentSection?: (sectionTag?: string, itemId?: string, targetType?: 'weekly' | 'core', targetId?: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  searchQuery?: string;
  weekId?: string;
  accentTheme?: AccentTheme;
}

export const JournalEntryCard: React.FC<JournalEntryCardProps> = React.memo(({
  bullet,
  onUpdate,
  onDelete,
  onIndentChange,
  onTogglePinTakeaway,
  onPreviewMedia,
  onOpenCommentSection,
  canEdit = false,
  canDelete = false,
  searchQuery,
  weekId,
  accentTheme = 'amber',
}) => {
  const { updateEntryTimestamp } = useJournalStore();
  const moveEntryToWeek = useJournalStore((s) => s.moveEntryToWeek);
  const allComments = useJournalStore((s) => s.comments);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  const entryComments = useMemo(() => {
    return (allComments || []).filter((c) => c.itemId === bullet.id && !c.resolved);
  }, [allComments, bullet.id]);

  const toggleForSession = () => {
    onUpdate({
      ...bullet,
      forSession: !bullet.forSession,
    });
  };

  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const setReminder = (iso: string | null) => {
    onUpdate(iso ? { ...bullet, remindAt: iso, completed: false } : { ...bullet, remindAt: undefined });
  };

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(bullet.text);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>(
    getNormalizedAttachments(bullet)
  );
  const [urlInput, setUrlInput] = useState('');
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [showTimestampPicker, setShowTimestampPicker] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'converting' | 'uploading'>('idle');
  const isProcessingUpload = uploadStatus !== 'idle';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTypingRef = useRef(false);
  const bulletRef = useRef(bullet);
  bulletRef.current = bullet;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Normalized attachments for display
  const activeAttachments = getNormalizedAttachments(bullet);

  // Sync props to local draft state when not typing
  useEffect(() => {
    if (!isTypingRef.current && !isEditing) {
      setText(bullet.text);
      setDraftAttachments(getNormalizedAttachments(bullet));
    }
  }, [bullet.text, bullet.attachments, bullet.mediaUrl, isEditing]);

  // Debounced auto-save effect: triggers 600ms after user stops editing
  useEffect(() => {
    if (!isEditing || !canEdit) {
      isTypingRef.current = false;
      return;
    }

    const currentBullet = bulletRef.current;
    const hasTextChange = text !== currentBullet.text;
    const currentAtts = getNormalizedAttachments(currentBullet);
    const hasAttChange =
      JSON.stringify(draftAttachments.map((a) => a.id)) !==
      JSON.stringify(currentAtts.map((a) => a.id));

    if (!hasTextChange && !hasAttChange) return;

    isTypingRef.current = true;
    setAutoSaveState('unsaved');

    const timer = setTimeout(() => {
      setAutoSaveState('saving');
      const primaryMedia = draftAttachments[0];
      onUpdateRef.current({
        ...bulletRef.current,
        text: text.trim(),
        attachments: draftAttachments,
        mediaUrl: primaryMedia?.url || undefined,
        mediaType: primaryMedia?.type || undefined,
        mediaCaption: primaryMedia?.caption || undefined,
      });
      console.log('[Auto-Save] Entry draft updated:', bulletRef.current.id);
      setAutoSaveState('saved');
      isTypingRef.current = false;
    }, 600);

    return () => clearTimeout(timer);
  }, [text, draftAttachments, isEditing, canEdit]);

  // Flush on unmount if user was typing
  useEffect(() => {
    return () => {
      if (isTypingRef.current && canEdit) {
        const primaryMedia = draftAttachments[0];
        onUpdateRef.current({
          ...bulletRef.current,
          text: text.trim(),
          attachments: draftAttachments,
          mediaUrl: primaryMedia?.url || undefined,
          mediaType: primaryMedia?.type || undefined,
          mediaCaption: primaryMedia?.caption || undefined,
        });
        console.log('[Auto-Save] Entry draft flushed:', bulletRef.current.id);
      }
    };
  }, [canEdit, draftAttachments, text]);

  // Multi-File upload handler (converts to persistent Base64 / Storage, with HEIC support)
  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit || !e.target.files || e.target.files.length === 0) return;

    try {
      const hasHeic = Array.from(e.target.files).some(
        (f: File) =>
          f.type === 'image/heic' ||
          f.type === 'image/heif' ||
          f.name.toLowerCase().endsWith('.heic') ||
          f.name.toLowerCase().endsWith('.heif')
      );
      setUploadStatus(hasHeic ? 'converting' : 'uploading');

      const newAttachments = await filesToPersistentAttachments(e.target.files, (status) => {
        setUploadStatus(status);
      });
      const combined = [...draftAttachments, ...newAttachments];
      setDraftAttachments(combined);

      // Auto-save update immediately
      const primaryMedia = combined[0];
      onUpdate({
        ...bullet,
        attachments: combined,
        mediaUrl: primaryMedia?.url || undefined,
        mediaType: primaryMedia?.type || undefined,
        mediaCaption: primaryMedia?.caption || undefined,
      });
    } catch (err) {
      console.error('Error reading attached files:', err);
    } finally {
      setUploadStatus('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrlAttachment = () => {
    if (!urlInput.trim()) return;
    const newAtt = createAttachmentFromUrl(urlInput.trim());
    const combined = [...draftAttachments, newAtt];
    setDraftAttachments(combined);
    setUrlInput('');

    const primaryMedia = combined[0];
    onUpdate({
      ...bullet,
      attachments: combined,
      mediaUrl: primaryMedia?.url || undefined,
      mediaType: primaryMedia?.type || undefined,
      mediaCaption: primaryMedia?.caption || undefined,
    });
  };

  const handleRemoveDraftAttachment = (idToRemove: string) => {
    const updated = draftAttachments.filter((a) => a.id !== idToRemove);
    setDraftAttachments(updated);
    const primaryMedia = updated[0];
    onUpdate({
      ...bullet,
      attachments: updated,
      mediaUrl: primaryMedia?.url || undefined,
      mediaType: primaryMedia?.type || undefined,
      mediaCaption: primaryMedia?.caption || undefined,
    });
  };

  const handleTextSubmit = () => {
    if (!canEdit) return;
    isTypingRef.current = false;
    const primaryMedia = draftAttachments[0];
    onUpdate({
      ...bullet,
      text: text.trim(),
      timestamp: bullet.timestamp || formatTimestamp(),
      attachments: draftAttachments,
      mediaUrl: primaryMedia?.url || undefined,
      mediaType: primaryMedia?.type || undefined,
      mediaCaption: primaryMedia?.caption || undefined,
    });
    setAutoSaveState('saved');
    setIsEditing(false);
  };

  const handleSaveTimestamp = async (newTimestamp: string, newIsoDate: string, isCustom: boolean) => {
    if (!canEdit) return;
    if (newIsoDate) {
      await updateEntryTimestamp(bullet.id, newIsoDate);
    } else {
      onUpdate({
        ...bullet,
        timestamp: newTimestamp,
        isoDate: newIsoDate,
        isCustomDate: isCustom,
        isEdited: true,
      });
    }
  };

  const toggleAnswerHighlight = () => {
    if (!canEdit) return;
    onUpdate({
      ...bullet,
      isAnswerHighlight: !bullet.isAnswerHighlight,
    });
  };

  const toggleCompleted = () => {
    if (!canEdit) return;
    onUpdate({
      ...bullet,
      completed: !bullet.completed,
    });
  };

  const indentPadding =
    bullet.indent === 0 ? 'ml-0' : bullet.indent === 1 ? 'ml-4 sm:ml-8' : 'ml-8 sm:ml-16';

  const previewAttachments = activeAttachments.slice(0, 2);
  const extraCount = Math.max(0, activeAttachments.length - 2);

  return (
    <div
      id={`bullet-${bullet.id}`}
      data-item-id={bullet.id}
      data-bullet-id={bullet.id}
      className={`group relative ${indentPadding} mb-3 w-full min-w-0 max-w-full transition-all duration-300 ${
        showTimestampPicker ? 'z-30' : 'z-0'
      }`}
    >
      {/* Visual Indent Line */}
      {bullet.indent > 0 && (
        <div className="absolute -left-3 sm:-left-4 top-3 bottom-0 w-px bg-stone-200 dark:bg-stone-800" />
      )}

      {/* Main Bullet Box */}
      <div
        className={`w-full max-w-full flex flex-col gap-3 box-border rounded-xl p-3 sm:p-4 border transition-all ${
          showTimestampPicker ? 'relative z-30' : ''
        } ${
          bullet.isAnswerHighlight
            ? `${currentAccent.iconBoxSelected} ${currentAccent.activeBorder} shadow-xs`
            : 'bg-(--j-field) border-(--j-line) shadow-2xs'
        }`}
      >
        {/* Highlight Callout Badge, Pinned Badge & Session Prep Badge */}
        {(bullet.isAnswerHighlight || bullet.pinnedToLearned || bullet.forSession || bullet.remindAt) && (
          <div className="flex flex-wrap items-center gap-1.5 w-full min-w-0">
            {bullet.remindAt && <ReminderChip iso={bullet.remindAt} completed={bullet.completed} />}
            {bullet.forSession && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-violet-800 dark:text-violet-300 bg-violet-100/90 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800/60 px-2.5 py-0.5 rounded-full w-fit shadow-2xs">
                <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400 shrink-0" />
                <span>For session</span>
                {bullet.discussedAt && (
                  <span className="text-[10px] text-(--j-ink2) tabular-nums ml-0.5">
                    (discussed)
                  </span>
                )}
              </div>
            )}

            {bullet.isAnswerHighlight && (
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${currentAccent.iconBox} ${currentAccent.textPrimary} px-2.5 py-0.5 rounded-full w-fit`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Therapist Answer / Highlight</span>
              </div>
            )}

            {bullet.pinnedToLearned && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 rounded-full w-fit shadow-2xs">
                <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Pinned to "Things I Learned About Myself"</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2.5 sm:gap-3 w-full min-w-0">
          {/* Bullet Style Icon & Complete Switch */}
          <button
            type="button"
            onClick={toggleCompleted}
            disabled={!canEdit}
            className={`mt-0.5 transition-colors shrink-0 ${
              canEdit
                ? `text-(--j-ink2) hover:${currentAccent.textPrimary} cursor-pointer`
                : 'text-(--j-ink2) cursor-default'
            }`}
            title={canEdit ? 'Toggle completed state' : 'Completed status'}
          >
            {bullet.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : bullet.indent === 0 ? (
              <Circle className="w-3.5 h-3.5" />
            ) : bullet.indent === 1 ? (
              <CornerDownRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Full-Width Content Container */}
          <div className="w-full flex-1 min-w-0 break-words whitespace-pre-wrap text-sm text-(--j-ink)">
            {isEditing && canEdit ? (
              <div className="space-y-3 w-full">
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <AutoGrowTextarea
                    minHeight={68}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                    }}
                    onBlur={() => {
                      if (!showMediaUploader) {
                        handleTextSubmit();
                      }
                    }}
                    className="w-full p-2.5 text-sm leading-relaxed bg-(--j-soft) border border-(--j-line) rounded-xl text-(--j-ink) focus:outline-none whitespace-pre-wrap break-words resize-none overflow-hidden min-h-[68px]"
                    rows={3}
                    autoFocus
                  />
                </div>

                {/* Inline Media Uploader Section */}
                {showMediaUploader && (
                  <div className="p-3 bg-(--j-soft) rounded-xl space-y-3 text-xs border border-(--j-line)">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-(--j-ink2)">
                        Multi-Media Attachments ({draftAttachments.length})
                      </span>
                      {draftAttachments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDraftAttachments([])}
                          className="text-rose-600 dark:text-rose-400 text-[11px] hover:underline flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Clear All
                        </button>
                      )}
                    </div>

                    {/* File Picker & URL Inputs */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        disabled={isProcessingUpload}
                        className={`cursor-pointer px-3 py-1.5 ${currentAccent.buttonPrimary} text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors disabled:opacity-50`}
                      >
                        {isProcessingUpload ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {uploadStatus === 'converting'
                            ? 'Converting...'
                            : uploadStatus === 'uploading'
                            ? 'Uploading...'
                            : 'Upload Files'}
                        </span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,image/heic,image/heif,.heic,.heif,video/*,application/pdf"
                        onChange={handleMultipleFilesUpload}
                        className="hidden"
                        disabled={isProcessingUpload}
                      />
                      <span className="text-[10px] text-(--j-ink2) font-medium">
                        OR add URL:
                      </span>
                      <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Paste image, video, or PDF URL..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddUrlAttachment();
                          }}
                          className="flex-1 p-1.5 text-xs bg-(--j-field) border border-(--j-line) rounded-lg text-(--j-ink)"
                        />
                        <button
                          type="button"
                          onClick={handleAddUrlAttachment}
                          className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg font-semibold hover:bg-stone-300 dark:hover:bg-stone-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Draft Thumbnails List */}
                    {draftAttachments.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                        {draftAttachments.map((att) => {
                          const isPdf = isPdfMedia(att.url, att.type);
                          const isVid = !isPdf && isVideoMedia(att.url, att.type);
                          return (
                            <div
                              key={att.id}
                              className="relative group/att rounded-lg overflow-hidden border border-(--j-line) bg-black aspect-square"
                            >
                              {isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-(--j-soft) text-rose-500 p-1 text-center select-none">
                                  <FileText className="w-5 h-5 mb-0.5" />
                                  <span className="text-[9px] font-bold  text-(--j-ink2) truncate w-full px-0.5">
                                    PDF
                                  </span>
                                </div>
                              ) : isVid ? (
                                att.thumbnailUrl ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={att.thumbnailUrl}
                                      alt=""
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sky-400">
                                      <Play className="w-4 h-4 fill-current drop-shadow-sm" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-stone-900 text-sky-400">
                                    <Video className="w-5 h-5" />
                                  </div>
                                )
                              ) : (
                                <img
                                  src={att.url}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftAttachment(att.id)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-sm hover:scale-110 transition-transform"
                                title="Remove file"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Mode Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTextSubmit}
                      className={`px-3 py-1.5 ${currentAccent.buttonPrimary} text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowMediaUploader(!showMediaUploader)}
                      className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-700 text-(--j-ink2) text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{showMediaUploader ? 'Hide Media' : 'Attach Photos / Videos'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1.5 text-stone-500 text-xs hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  {/* Auto-save status indicator */}
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <SaveStatusBadge status={autoSaveState} />
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode Text */
              <div
                onClick={() => {
                  if (canEdit) setIsEditing(true);
                }}
                className={`space-y-1.5 ${canEdit ? 'cursor-pointer hover:opacity-95' : 'cursor-default'}`}
              >
                <p
                  className={`flex-1 w-full text-sm leading-relaxed whitespace-pre-wrap break-words text-(--j-ink) ${
                    bullet.completed ? 'line-through opacity-60' : ''
                  }`}
                >
                  {bullet.text ? (
                    <HighlightText text={bullet.text} highlight={searchQuery} />
                  ) : (
                    <span className="italic text-(--j-ink2)">Empty entry...</span>
                  )}
                </p>
              </div>
            )}

            {/* Clean Entry Preview: Compact Thumbnail Badge & Inspect Pill (No Screen Clutter) */}
            {activeAttachments.length > 0 && !isEditing && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {/* Small Micro-Thumbnails Carousel (Max 2 items) */}
                <div className="flex items-center gap-1.5">
                  {previewAttachments.map((att, idx) => {
                    const isPdf = isPdfMedia(att.url, att.type);
                    const isVid = !isPdf && isVideoMedia(att.url, att.type);
                    return (
                      <div
                        key={att.id || idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsInspectOpen(true);
                        }}
                        className="relative w-11 h-11 rounded-lg overflow-hidden border border-(--j-line) bg-stone-900 cursor-pointer pointer-events-auto shadow-2xs hover:scale-105 transition-transform"
                        title="Click to inspect all attachments"
                      >
                        {isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-(--j-soft) text-rose-500 p-0.5 text-center select-none">
                            <FileText className="w-4 h-4" />
                            <span className="text-[8px] font-bold tracking-tight text-(--j-ink2)">
                              PDF
                            </span>
                          </div>
                        ) : isVid ? (
                          att.thumbnailUrl ? (
                            <div className="relative w-full h-full">
                              <img
                                src={att.thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-amber-400">
                                <Play className="w-3.5 h-3.5 fill-current drop-shadow-sm" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-stone-950 text-amber-400">
                              <Play className="w-4 h-4 fill-current" />
                            </div>
                          )
                        ) : (
                          <img
                            src={att.url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                    );
                  })}

                  {extraCount > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInspectOpen(true);
                      }}
                      className="w-11 h-11 rounded-lg border border-(--j-line) bg-(--j-soft) flex items-center justify-center text-xs font-bold text-(--j-ink2) cursor-pointer pointer-events-auto hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
                      title="Inspect all attachments"
                    >
                      +{extraCount}
                    </div>
                  )}
                </div>

                {/* Inspect Attachments Pill Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInspectOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-200 border border-(--j-line) cursor-pointer pointer-events-auto transition-all shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>Inspect Media ({activeAttachments.length})</span>
                </button>
              </div>
            )}

            {/* Bottom Row: Responsive Non-Stacking Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2.5 border-t border-(--j-line) w-full">
              {/* Left Side: Date Badge with Natural Width (No Vertical Word Stacking) */}
              <div className={`relative ${showTimestampPicker ? 'z-[9999]' : 'z-10'}`}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTimestampPicker((prev) => !prev);
                  }}
                  title="Click to edit date or timestamp"
                  className="flex items-center gap-2 bg-(--j-soft) border border-(--j-line) rounded-lg px-2.5 py-1.5 min-w-fit cursor-pointer hover:bg-stone-200 dark:hover:bg-white/10 transition-colors group/time"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 group-hover/time:scale-110 transition-transform" />
                  <span className="text-xs text-(--j-ink) whitespace-nowrap tabular-nums font-medium">
                    <HighlightText
                      text={bullet.timestamp || formatTimestamp()}
                      highlight={searchQuery}
                    />
                  </span>
                  {bullet.isCustomDate && (
                    <button
                      type="button"
                      className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded ml-0.5 shrink-0"
                    >
                      Custom
                    </button>
                  )}
                  <Edit2 className="w-3 h-3 text-(--j-ink2) shrink-0 ml-0.5" />
                </div>

                {/* Timestamp Picker Popover */}
                {showTimestampPicker && (
                  <TimestampPickerPopover
                    currentTimestamp={bullet.timestamp || formatTimestamp()}
                    isoDate={bullet.isoDate}
                    onSave={handleSaveTimestamp}
                    onClose={() => setShowTimestampPicker(false)}
                    align="left"
                  />
                )}
              </div>

              {/* Right Side: Action Pills in an Auto-Wrapping Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {!isEditing && canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-2.5 py-1 rounded-lg bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-(--j-ink2) border border-(--j-line) transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}

                {/* Comment Button */}
                {onOpenCommentSection && (
                  <button
                    type="button"
                    onClick={() => onOpenCommentSection('Journal Bullets', bullet.id, 'weekly', weekId)}
                    className="px-2.5 py-1 rounded-lg bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-(--j-ink2) border border-(--j-line) transition-colors cursor-pointer flex items-center gap-1"
                    title="Comment on this entry"
                  >
                    <MessageSquare className="w-3 h-3 text-(--j-ink2)" />
                    <span>Comment</span>
                  </button>
                )}

                {/* Highlight Button */}
                <button
                  type="button"
                  onClick={toggleAnswerHighlight}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                    bullet.isAnswerHighlight
                      ? `${currentAccent.bg500} text-white ${currentAccent.activeBorder}`
                      : 'bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-(--j-ink2) border-(--j-line)'
                  }`}
                >
                  <MessageSquare
                    className={`w-3 h-3 ${
                      bullet.isAnswerHighlight ? 'text-white' : currentAccent.textPrimary
                    }`}
                  />
                  <span>Highlight</span>
                </button>

                {/* Indent Controls */}
                {bullet.indent > 0 && (
                  <button
                    type="button"
                    onClick={() => onIndentChange(bullet.indent - 1)}
                    className="px-2.5 py-1 rounded-lg bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-(--j-ink2) border border-(--j-line) transition-colors cursor-pointer"
                    title="Outdent"
                  >
                    ← Outdent
                  </button>
                )}

                {bullet.indent < 2 && (
                  <button
                    type="button"
                    onClick={() => onIndentChange(bullet.indent + 1)}
                    className="px-2.5 py-1 rounded-lg bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-(--j-ink2) border border-(--j-line) transition-colors cursor-pointer"
                    title="Indent"
                  >
                    Indent →
                  </button>
                )}

                {/* Pin Button */}
                {onTogglePinTakeaway && (
                  <button
                    type="button"
                    onClick={() => onTogglePinTakeaway(bullet)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                      bullet.pinnedToLearned
                        ? 'bg-amber-500 text-[var(--on-accent,#fff)] border-amber-600'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    <span>{bullet.pinnedToLearned ? 'Pinned' : 'Pin'}</span>
                  </button>
                )}

                {/* Bring to session tag toggle chip (owner/editor only) */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={toggleForSession}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                      bullet.forSession
                        ? 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-700 shadow-2xs font-semibold'
                        : 'bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-(--j-ink2) border-(--j-line)'
                    }`}
                    title={bullet.forSession ? 'Tagged for session (click to untag)' : 'Bring to session'}
                  >
                    <Sparkles
                      className={`w-3 h-3 ${
                        bullet.forSession ? 'text-violet-600 dark:text-violet-400' : 'text-(--j-ink2)'
                      }`}
                    />
                    <span>{bullet.forSession ? 'For session' : 'Bring to session'}</span>
                  </button>
                )}

                {/* Reminder: add, change or clear the alarm */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowReminderPicker(!showReminderPicker)}
                    aria-expanded={showReminderPicker}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                      bullet.remindAt
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 font-semibold'
                        : 'bg-(--j-soft) hover:bg-stone-200 dark:hover:bg-white/10 text-(--j-ink2) border-(--j-line)'
                    }`}
                    title={bullet.remindAt ? 'Change or clear the reminder' : 'Add a reminder with an alarm'}
                  >
                    <Bell className="w-3 h-3" />
                    <span>{bullet.remindAt ? 'Reminder' : 'Remind me'}</span>
                  </button>
                )}

                {/* Move to another week */}
                {canEdit && weekId && (
                  <button
                    type="button"
                    onClick={() => setIsMoveModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-(--j-soft) text-(--j-ink2) hover:text-stone-900 dark:hover:text-stone-100 border border-(--j-line) hover:bg-stone-200/60 dark:hover:bg-stone-700/60 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Move to another week…"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Move to another week…</span>
                  </button>
                )}

                {/* Delete Button */}
                {canDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              {canEdit && showReminderPicker && (
                <div className="pt-2">
                  <ReminderPicker value={bullet.remindAt || null} onChange={setReminder} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Therapist Comments: small inset box ("Therapist · commented Fri" + text) with Reply button */}
        {entryComments.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-(--j-line) w-full">
            {entryComments.map((comment) => (
              <div
                key={comment.id}
                className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{(comment.authorName || comment.authorEmail || 'Commenter')} · commented {formatCommentWeekday(comment.timestamp)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenCommentSection?.('Journal Bullets', bullet.id, 'weekly', weekId)
                    }
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                </div>
                <p className="text-(--j-ink) text-xs leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dedicated Inspect Modal */}
      <MediaInspectModal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        title={bullet.text ? bullet.text.slice(0, 45) + (bullet.text.length > 45 ? '...' : '') : 'Entry Attachments'}
        subtitle={bullet.timestamp}
        attachments={activeAttachments}
        canEdit={canEdit}
        accentTheme={accentTheme}
        onAddAttachments={(newAtts) => {
          const combined = [...activeAttachments, ...newAtts];
          const primaryMedia = combined[0];
          onUpdate({
            ...bullet,
            attachments: combined,
            mediaUrl: primaryMedia?.url || undefined,
            mediaType: primaryMedia?.type || undefined,
            mediaCaption: primaryMedia?.caption || undefined,
          });
        }}
        onRemoveAttachment={(idToRemove) => {
          const updated = activeAttachments.filter((a) => a.id !== idToRemove);
          const primaryMedia = updated[0];
          onUpdate({
            ...bullet,
            attachments: updated,
            mediaUrl: primaryMedia?.url || undefined,
            mediaType: primaryMedia?.type || undefined,
            mediaCaption: primaryMedia?.caption || undefined,
          });
        }}
        onUpdateCaption={(attId, caption) => {
          const updated = activeAttachments.map((a) => (a.id === attId ? { ...a, caption } : a));
          onUpdate({
            ...bullet,
            attachments: updated,
          });
        }}
      />

      {/* Move Entry Modal */}
      {isMoveModalOpen && weekId && (
        <MoveEntryModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          bullet={bullet}
          sourceWeekId={weekId}
          onSelectTargetWeek={(targetWeekId) => {
            moveEntryToWeek(weekId, targetWeekId, bullet.id);
            setIsMoveModalOpen(false);
          }}
        />
      )}
    </div>
  );
});
