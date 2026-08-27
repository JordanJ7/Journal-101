import {
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
  Save,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useJournalStore } from '../../store/useJournalStore';
import { AccentTheme, Attachment, BulletPoint } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { formatTimestamp } from '../../utils/storage';
import { HighlightText } from '../HighlightText';
import { TimestampPickerPopover } from './TimestampPickerPopover';
import { MediaInspectModal } from '../MediaInspectModal';
import { SaveStatusBadge } from '../SaveStatusBadge';
import {
  createAttachmentFromUrl,
  filesToPersistentAttachments,
  getNormalizedAttachments,
  isPdfMedia,
  isVideoMedia,
} from '../../utils/mediaUtils';
import { LightboxMedia } from '../MediaLightboxModal';

export interface JournalEntryCardProps {
  bullet: BulletPoint;
  onUpdate: (updated: BulletPoint) => void;
  onDelete: () => void;
  onIndentChange: (newIndent: number) => void;
  onTogglePinTakeaway?: (bullet: BulletPoint) => void;
  onPreviewMedia?: (media: LightboxMedia) => void;
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
  canEdit = false,
  canDelete = false,
  searchQuery,
  accentTheme = 'amber',
}) => {
  const { updateEntryTimestamp } = useJournalStore();
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

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
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
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
      console.log('[Auto-Save] Entry saved to Firestore:', bulletRef.current.id);
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
        console.log('[Auto-Save] Entry saved to Firestore:', bulletRef.current.id);
      }
    };
  }, [canEdit, draftAttachments, text]);

  // Multi-File upload handler (converts to persistent Base64)
  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit || !e.target.files || e.target.files.length === 0) return;

    try {
      setIsProcessingUpload(true);
      const newAttachments = await filesToPersistentAttachments(e.target.files);
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
      setIsProcessingUpload(false);
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
      className={`group relative ${indentPadding} mb-3 w-full min-w-0 max-w-full ${
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
            : 'bg-white dark:bg-neutral-900 border-stone-200/80 dark:border-white/5 shadow-2xs'
        }`}
      >
        {/* Highlight Callout Badge & Pinned Badge */}
        {(bullet.isAnswerHighlight || bullet.pinnedToLearned) && (
          <div className="flex flex-wrap items-center gap-1.5 w-full min-w-0">
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
                ? `text-stone-400 hover:${currentAccent.textPrimary} cursor-pointer`
                : 'text-stone-400 cursor-default'
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
          <div className="w-full flex-1 min-w-0 break-words whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
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
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => {
                      if (!showMediaUploader) {
                        handleTextSubmit();
                      }
                    }}
                    className="w-full p-2.5 text-sm leading-relaxed bg-stone-50 dark:bg-neutral-800 border border-stone-300 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none whitespace-pre-wrap break-words"
                    rows={3}
                    autoFocus
                  />
                </div>

                {/* Inline Media Uploader Section */}
                {showMediaUploader && (
                  <div className="p-3 bg-stone-100 dark:bg-stone-800/90 rounded-xl space-y-3 text-xs border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-700 dark:text-stone-300">
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
                        <span>Upload Files</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,application/pdf"
                        onChange={handleMultipleFilesUpload}
                        className="hidden"
                        disabled={isProcessingUpload}
                      />
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
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
                          className="flex-1 p-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
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
                              className="relative group/att rounded-lg overflow-hidden border border-stone-300 dark:border-stone-700 bg-black aspect-square"
                            >
                              {isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-800 text-rose-500 p-1 text-center select-none">
                                  <FileText className="w-5 h-5 mb-0.5" />
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 truncate w-full px-0.5">
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
                      className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
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
                  className={`flex-1 w-full text-sm leading-relaxed whitespace-pre-wrap break-words text-stone-800 dark:text-stone-200 ${
                    bullet.completed ? 'line-through opacity-60' : ''
                  }`}
                >
                  {bullet.text ? (
                    <HighlightText text={bullet.text} highlight={searchQuery} />
                  ) : (
                    <span className="italic text-stone-400">Empty entry...</span>
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
                        className="relative w-11 h-11 rounded-lg overflow-hidden border border-stone-300 dark:border-white/10 bg-stone-900 cursor-pointer pointer-events-auto shadow-2xs hover:scale-105 transition-transform"
                        title="Click to inspect all attachments"
                      >
                        {isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-800 text-rose-500 p-0.5 text-center select-none">
                            <FileText className="w-4 h-4" />
                            <span className="text-[8px] font-bold tracking-tight text-stone-600 dark:text-stone-300">
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
                      className="w-11 h-11 rounded-lg border border-stone-300 dark:border-white/10 bg-stone-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer pointer-events-auto hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-200 border border-stone-200 dark:border-white/10 cursor-pointer pointer-events-auto transition-all shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>Inspect Media ({activeAttachments.length})</span>
                </button>
              </div>
            )}

            {/* Bottom Row: Responsive Non-Stacking Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2.5 border-t border-stone-200/80 dark:border-white/5 w-full">
              {/* Left Side: Date Badge with Natural Width (No Vertical Word Stacking) */}
              <div className={`relative ${showTimestampPicker ? 'z-[9999]' : 'z-10'}`}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTimestampPicker((prev) => !prev);
                  }}
                  title="Click to edit date or timestamp"
                  className="flex items-center gap-2 bg-stone-100/90 dark:bg-neutral-800/60 border border-stone-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 min-w-fit cursor-pointer hover:bg-stone-200 dark:hover:bg-white/10 transition-colors group/time"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 group-hover/time:scale-110 transition-transform" />
                  <span className="text-xs text-stone-800 dark:text-neutral-200 whitespace-nowrap font-mono font-medium">
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
                  <Edit2 className="w-3 h-3 text-stone-400 dark:text-stone-500 shrink-0 ml-0.5" />
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
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-white/5 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}

                {/* Highlight Button */}
                <button
                  type="button"
                  onClick={toggleAnswerHighlight}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                    bullet.isAnswerHighlight
                      ? `${currentAccent.bg500} text-white ${currentAccent.activeBorder}`
                      : 'bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-300 border-stone-200 dark:border-white/5'
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
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-white/5 transition-colors cursor-pointer"
                    title="Outdent"
                  >
                    ← Outdent
                  </button>
                )}

                {bullet.indent < 2 && (
                  <button
                    type="button"
                    onClick={() => onIndentChange(bullet.indent + 1)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-white/5 transition-colors cursor-pointer"
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
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    <span>{bullet.pinnedToLearned ? 'Pinned' : 'Pin'}</span>
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
            </div>
          </div>
        </div>
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
    </div>
  );
});
