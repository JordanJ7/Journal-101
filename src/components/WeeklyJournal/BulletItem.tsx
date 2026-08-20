import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  CornerDownRight,
  Edit2,
  Edit3,
  Eye,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Play,
  Save,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, saveJournalDataToCloud } from '../../lib/firebase';
import { useJournalStore } from '../../store/useJournalStore';
import { AccentTheme, BulletPoint } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { formatTimestamp, parseDateFromTimestamp } from '../../utils/storage';
import { LightboxMedia } from '../MediaLightboxModal';
import { HighlightText } from '../HighlightText';
import { TimestampPickerPopover } from './TimestampPickerPopover';

interface BulletItemProps {
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

export const BulletItem: React.FC<BulletItemProps> = React.memo(({
  bullet,
  onUpdate,
  onDelete,
  onIndentChange,
  onTogglePinTakeaway,
  onPreviewMedia,
  canEdit = true,
  canDelete = true,
  searchQuery,
  weekId,
  accentTheme = 'amber',
}) => {
  const { weeks, updateBulletTimestamp, updateEntryTimestamp } = useJournalStore();
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  // Direct Date Update handler with optimistic state and direct Firestore commit
  const handleDateUpdate = async (entryId: string, newDateTimeString: string) => {
    if (!newDateTimeString) return;

    const dateObj = new Date(newDateTimeString);
    if (isNaN(dateObj.getTime())) return;

    const isoString = dateObj.toISOString();
    await updateEntryTimestamp(entryId, isoString);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(bullet.text);
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState(bullet.mediaUrl || '');
  const [mediaCaption, setMediaCaption] = useState(bullet.mediaCaption || '');
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [showTimestampPicker, setShowTimestampPicker] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Track latest props to avoid clobbering during active typing
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setText(bullet.text);
      setMediaUrl(bullet.mediaUrl || '');
      setMediaCaption(bullet.mediaCaption || '');
    }
  }, [bullet.text, bullet.mediaUrl, bullet.mediaCaption]);

  // Debounced auto-save effect: triggers 600ms after user stops typing in the editor
  useEffect(() => {
    if (!isEditing || !canEdit) {
      isTypingRef.current = false;
      return;
    }

    // Check if there are real changes compared to bullet
    const hasChanges =
      text !== bullet.text ||
      (mediaUrl || '') !== (bullet.mediaUrl || '') ||
      (mediaCaption || '') !== (bullet.mediaCaption || '');

    if (!hasChanges) return;

    isTypingRef.current = true;
    setAutoSaveState('unsaved');

    const timer = setTimeout(() => {
      setAutoSaveState('saving');
      onUpdate({
        ...bullet,
        text: text.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        mediaCaption: mediaCaption.trim() || undefined,
      });
      setAutoSaveState('saved');
      isTypingRef.current = false;
    }, 600);

    return () => clearTimeout(timer);
  }, [text, mediaUrl, mediaCaption, isEditing, canEdit, bullet, onUpdate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSubmit = () => {
    if (!canEdit) return;
    isTypingRef.current = false;
    onUpdate({
      ...bullet,
      text: text.trim(),
      // Preserve custom timestamp if user backdated/set it, otherwise keep current timestamp
      timestamp: bullet.timestamp || formatTimestamp(),
      mediaUrl: mediaUrl.trim() || undefined,
      mediaCaption: mediaCaption.trim() || undefined,
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

  const isVideo =
    bullet.mediaUrl &&
    (bullet.mediaUrl.toLowerCase().endsWith('.mp4') ||
      bullet.mediaUrl.toLowerCase().endsWith('.webm') ||
      bullet.mediaUrl.toLowerCase().endsWith('.mov') ||
      bullet.mediaUrl.toLowerCase().includes('youtube.com') ||
      bullet.mediaUrl.toLowerCase().includes('youtu.be') ||
      bullet.mediaUrl.toLowerCase().includes('vimeo.com'));

  const handleOpenMediaPreview = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (bullet.mediaUrl && onPreviewMedia) {
      onPreviewMedia({
        url: bullet.mediaUrl,
        title: bullet.text || 'Journal Media Attachment',
        caption: bullet.mediaCaption,
        timestamp: bullet.timestamp,
        type: isVideo ? 'video' : 'image',
        categoryLabel: 'Weekly Entry Attachment',
      });
    }
  };

  const indentPadding = bullet.indent === 0 ? 'ml-0' : bullet.indent === 1 ? 'ml-6 sm:ml-8' : 'ml-12 sm:ml-16';

  return (
    <div className={`group relative ${indentPadding} mb-3 w-full min-w-0 max-w-full ${showTimestampPicker ? 'z-30' : 'z-0'}`}>
      {/* Visual Indent Line */}
      {bullet.indent > 0 && (
        <div className="absolute -left-4 top-3 bottom-0 w-px bg-stone-200 dark:bg-stone-800" />
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
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${currentAccent.iconBox} ${currentAccent.textPrimary} px-2.5 py-0.5 rounded-full w-fit`}>
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
            onClick={toggleCompleted}
            disabled={!canEdit}
            className={`mt-0.5 transition-colors shrink-0 ${
              canEdit ? `text-stone-400 hover:${currentAccent.textPrimary} cursor-pointer` : 'text-stone-400 cursor-default'
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

          {/* Full-Width Text Container */}
          <div className="w-full flex-1 min-w-0 break-words whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
            {isEditing && canEdit ? (
              <div className="space-y-2.5 w-full">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-2.5 text-sm leading-relaxed bg-stone-50 dark:bg-neutral-800 border border-stone-300 dark:border-white/10 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none whitespace-pre-wrap break-words"
                  rows={3}
                  autoFocus
                />
                
                {/* Inline Media Input */}
                {showMediaInput && (
                  <div className="p-3 bg-stone-100 dark:bg-stone-800/90 rounded-xl space-y-2 text-xs border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-700 dark:text-stone-300">Attach Photo:</span>
                      {mediaUrl && (
                        <button
                          onClick={() => setMediaUrl('')}
                          className="text-rose-600 dark:text-rose-400 text-[11px] hover:underline flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Remove Photo
                        </button>
                      )}
                    </div>

                    {/* Computer File Upload Button */}
                    <div className="flex items-center gap-2">
                      <label className={`cursor-pointer px-3 py-1.5 ${currentAccent.buttonPrimary} text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors`}>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload from Computer</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">OR paste URL:</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Image / Photo URL..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    />

                    <input
                      type="text"
                      placeholder="Optional caption..."
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    />

                    {mediaUrl && (
                      <div className="mt-1 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 max-h-32">
                        <img src={mediaUrl} alt="Preview" className="w-full h-28 object-cover" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTextSubmit}
                      className={`px-3 py-1.5 ${currentAccent.buttonPrimary} text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                    <button
                      onClick={() => setShowMediaInput(!showMediaInput)}
                      className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{showMediaInput ? 'Hide Photo' : 'Attach Photo'}</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1.5 text-stone-500 text-xs hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  {/* Auto-save status indicator */}
                  <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                    {autoSaveState === 'unsaved' && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Auto-saving in 2s...</span>
                      </span>
                    )}
                    {autoSaveState === 'saving' && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Syncing to cloud...</span>
                      </span>
                    )}
                    {autoSaveState === 'saved' && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                        <span>Auto-saved</span>
                      </span>
                    )}
                    {autoSaveState === 'idle' && (
                      <span className="text-stone-400 dark:text-stone-500 text-[10px]">
                        Auto-saves 2s after typing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  if (canEdit) setIsEditing(true);
                }}
                className={`space-y-1.5 ${canEdit ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
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

            {/* Attached Photo/Video Preview with Semi-Fullscreen Lightbox trigger */}
            {bullet.mediaUrl && !isEditing && (
              <div
                onClick={handleOpenMediaPreview}
                className="mt-2.5 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 max-w-md bg-stone-950 cursor-pointer group relative shadow-2xs hover:shadow-md transition-all"
                title="Click to view photo or video in full screen"
              >
                {isVideo ? (
                  <div className="relative w-full h-48 bg-stone-950 flex items-center justify-center">
                    <video
                      src={bullet.mediaUrl}
                      className="w-full h-48 object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-stone-950/40 group-hover:bg-stone-950/20 transition-colors flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white/90 text-stone-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-48 overflow-hidden bg-stone-900">
                    <img
                      src={bullet.mediaUrl}
                      alt={bullet.mediaCaption || 'Entry media attachment'}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-stone-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px] pointer-events-none">
                      <div className="px-3 py-1.5 rounded-full bg-stone-950/80 border border-white/20 flex items-center gap-1.5 shadow-lg">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>View Full Screen</span>
                      </div>
                    </div>
                  </div>
                )}

                {bullet.mediaCaption && (
                  <div className="p-2 text-[11px] text-stone-300 bg-stone-950/90 flex items-center justify-between border-t border-stone-800">
                    <p className="italic truncate">{bullet.mediaCaption}</p>
                    <span className="text-[10px] text-sky-400 font-bold ml-2 shrink-0 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>Enlarge</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Row: Timestamp (Left) and Actions Toolbar / Mobile Overflow Menu */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mt-3 pt-2 border-t border-stone-200/60 dark:border-white/5 w-full">
              {/* Bottom-left: Interactive Click-to-Edit Timestamp Chip */}
              <div className={`relative inline-block ${showTimestampPicker ? 'z-[9999]' : 'z-10'}`}>
                <button
                  type="button"
                  id={`timestamp-btn-${bullet.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTimestampPicker((prev) => !prev);
                  }}
                  title="Click to edit or backdate entry date and time"
                  className={`inline-flex items-center gap-2 cursor-pointer font-mono px-3 py-2 -ml-1 rounded-xl text-xs min-h-[44px] text-stone-700 dark:text-stone-200 bg-stone-100/80 dark:bg-white/[0.06] hover:${currentAccent.textPrimary} hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all group/time border border-stone-200/80 dark:border-white/10`}
                >
                  <Clock className={`w-4 h-4 ${currentAccent.textPrimary} shrink-0 group-hover/time:scale-110 transition-transform`} />
                  <span className="font-semibold underline decoration-stone-300 dark:decoration-stone-600 underline-offset-2">
                    <HighlightText text={bullet.timestamp || formatTimestamp()} highlight={searchQuery} />
                  </span>
                  {bullet.isCustomDate && (
                    <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                      Custom
                    </span>
                  )}
                  <Edit2 className="w-3.5 h-3.5 text-stone-400 dark:text-stone-400 ml-0.5 transition-colors" />
                </button>

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

              {/* Action Toolbar: Desktop Horizontal Row & Mobile Overflow Dropdown */}
              <div className="relative">
                  {/* Desktop Actions (sm and up) */}
                  <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                    {/* Edit text button */}
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        title="Edit text"
                        className="px-2.5 py-1 bg-stone-100 dark:bg-white/[0.06] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-white/10 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium rounded-lg flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Edit</span>
                      </button>
                    )}

                    {/* Highlight Answer Switch Button */}
                    <button
                      onClick={toggleAnswerHighlight}
                      title="Highlight as therapist answer"
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border shadow-2xs ${
                        bullet.isAnswerHighlight
                          ? `${currentAccent.bg500} text-white ${currentAccent.activeBorder}`
                          : 'bg-stone-100 dark:bg-white/[0.06] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-white/10 hover:bg-stone-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 ${bullet.isAnswerHighlight ? 'text-white' : currentAccent.textPrimary}`} />
                      <span className="text-[11px] font-semibold">Highlight</span>
                    </button>

                    {/* Indent Controls */}
                    {bullet.indent > 0 && (
                      <button
                        onClick={() => onIndentChange(bullet.indent - 1)}
                        title="Outdent: move bullet left"
                        className="px-2.5 py-1 bg-stone-100 dark:bg-white/[0.06] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-white/10 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium rounded-lg flex items-center gap-1"
                      >
                        <span className="font-bold text-xs">←</span>
                        <span className="text-[11px] font-semibold">Outdent</span>
                      </button>
                    )}
                    {bullet.indent < 2 && (
                      <button
                        onClick={() => onIndentChange(bullet.indent + 1)}
                        title="Indent: move bullet right"
                        className="px-2.5 py-1 bg-stone-100 dark:bg-white/[0.06] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-white/10 hover:bg-stone-200 dark:hover:bg-white/10 text-xs font-medium rounded-lg flex items-center gap-1"
                      >
                        <span className="text-[11px] font-semibold">Indent</span>
                        <span className="font-bold text-xs">→</span>
                      </button>
                    )}

                    {/* Pin to Things I Learned About Myself Button */}
                    {onTogglePinTakeaway && (
                      <button
                        onClick={() => onTogglePinTakeaway(bullet)}
                        title={bullet.pinnedToLearned ? 'Unpin from Things I Learned About Myself' : 'Pin to Things I Learned About Myself'}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border shadow-2xs ${
                          bullet.pinnedToLearned
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">{bullet.pinnedToLearned ? 'Pinned' : 'Pin'}</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    {canDelete && (
                      <button
                        onClick={onDelete}
                        title="Delete this entry bullet"
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span className="text-[11px] font-semibold">Delete</span>
                      </button>
                    )}
                  </div>

                  {/* Mobile Actions: Compact Row with Overflow Menu (sm:hidden) */}
                  <div className="flex sm:hidden items-center justify-between gap-1.5 w-full pt-1">
                    <div className="flex items-center gap-1.5">
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-2.5 py-1.5 bg-stone-100 dark:bg-white/[0.08] text-stone-700 dark:text-stone-200 rounded-lg text-xs font-medium flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Edit</span>
                        </button>
                      )}
                      <button
                        onClick={toggleAnswerHighlight}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                          bullet.isAnswerHighlight
                            ? `${currentAccent.bg500} text-white`
                            : 'bg-stone-100 dark:bg-white/[0.08] text-stone-700 dark:text-stone-200'
                        }`}
                      >
                        <MessageSquare className={`w-3.5 h-3.5 ${bullet.isAnswerHighlight ? 'text-white' : currentAccent.textPrimary}`} />
                        <span className="text-[11px]">Highlight</span>
                      </button>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMobileActions(!showMobileActions);
                        }}
                        className="p-1.5 bg-stone-100 dark:bg-white/[0.08] text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-white/15"
                        title="More options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {showMobileActions && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1.5 w-44 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl py-1 z-30 flex flex-col divide-y divide-stone-100 dark:divide-stone-700"
                        >
                          <div className="p-1 space-y-0.5">
                            {bullet.indent > 0 && (
                              <button
                                onClick={() => {
                                  onIndentChange(bullet.indent - 1);
                                  setShowMobileActions(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg flex items-center gap-2"
                              >
                                <span>←</span>
                                <span>Outdent</span>
                              </button>
                            )}
                            {bullet.indent < 2 && (
                              <button
                                onClick={() => {
                                  onIndentChange(bullet.indent + 1);
                                  setShowMobileActions(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg flex items-center gap-2"
                              >
                                <span>→</span>
                                <span>Indent</span>
                              </button>
                            )}
                            {onTogglePinTakeaway && (
                              <button
                                onClick={() => {
                                  onTogglePinTakeaway(bullet);
                                  setShowMobileActions(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-2"
                              >
                                <Pin className="w-3.5 h-3.5" />
                                <span>{bullet.pinnedToLearned ? 'Unpin Takeaway' : 'Pin to Learned'}</span>
                              </button>
                            )}
                          </div>
                          {canDelete && (
                            <div className="p-1">
                              <button
                                onClick={() => {
                                  setShowMobileActions(false);
                                  onDelete();
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Entry</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
});
