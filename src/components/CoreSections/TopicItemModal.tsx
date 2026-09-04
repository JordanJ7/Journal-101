import { AlertCircle, Eye, FileText, Folder, Image as ImageIcon, Loader2, Play, Plus, Upload, Video, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CORE_CATEGORIES_CONFIG } from '../../data/initialData';
import { Attachment, CoreCategoryConfig, CoreCategoryId, CoreTopicItem } from '../../types';
import { formatTimestamp } from '../../utils/storage';
import { BulletedNoteEditor } from './BulletedNoteEditor';
import { SaveStatusBadge, SaveStatusState } from '../SaveStatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import {
  createAttachmentFromUrl,
  filesToPersistentAttachments,
  getNormalizedAttachments,
  isPdfMedia,
  isVideoMedia,
  calculateAttachmentsSize,
  isAttachmentsSizeExceeded,
  MAX_SAFE_ATTACHMENTS_SIZE_BYTES,
} from '../../utils/mediaUtils';
import { MediaInspectModal } from '../MediaInspectModal';

interface TopicItemModalProps {
  item?: CoreTopicItem | null;
  activeCategory: CoreCategoryId;
  coreCategories?: CoreCategoryConfig[];
  onSave: (item: CoreTopicItem, shouldClose?: boolean) => Promise<void> | void;
  onClose: () => void;
  canEdit?: boolean;
}

export const TopicItemModal: React.FC<TopicItemModalProps> = React.memo(({
  item,
  activeCategory,
  coreCategories = CORE_CATEGORIES_CONFIG,
  onSave,
  onClose,
  canEdit: propCanEdit,
}) => {
  const { canEdit: hookCanEdit, isCommenter } = usePermissions();
  const canEdit = propCanEdit !== undefined ? propCanEdit : hookCanEdit;
  const [selectedCategoryId, setSelectedCategoryId] = useState<CoreCategoryId>(
    item?.categoryId || activeCategory
  );
  const categoryConfig = coreCategories.find((c) => c.id === selectedCategoryId) || coreCategories[0];

  // Controlled local draft state isolated from background Firestore updates
  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');
  const [status, setStatus] = useState<any>(item?.status || 'Draft');
  const [priority, setPriority] = useState<any>(item?.priority || 'Medium');
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>(
    item ? getNormalizedAttachments(item) : []
  );
  const [urlInput, setUrlInput] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'converting' | 'uploading'>('idle');
  const isProcessingUpload = uploadStatus !== 'idle';
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [location, setLocation] = useState(item?.location || '');
  const [dateTag, setDateTag] = useState(item?.dateTag || formatTimestamp());
  const [notes, setNotes] = useState(item?.notes || '');
  const [answers, setAnswers] = useState(item?.answers || '');
  const [isHighlightedAnswer, setIsHighlightedAnswer] = useState(item?.isHighlightedAnswer || false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<SaveStatusState>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const isUserTypingRef = useRef(false);
  const hasEverTypedRef = useRef(false);
  const modalMountedItemIdRef = useRef<string | undefined>(item?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate approximate attachment size in KB
  const totalAttachmentSizeBytes = useMemo(
    () => calculateAttachmentsSize(draftAttachments),
    [draftAttachments]
  );
  const isOverSizeLimit = totalAttachmentSizeBytes > MAX_SAFE_ATTACHMENTS_SIZE_BYTES;
  const attachmentSizeKB = Math.round(totalAttachmentSizeBytes / 1024);

  // Synchronize initial item changes ONLY if user is NOT actively typing and the opened item ID changed
  useEffect(() => {
    if (!item) return;
    if (item.id !== modalMountedItemIdRef.current) {
      modalMountedItemIdRef.current = item.id;
      hasEverTypedRef.current = false;
      setSelectedCategoryId(item.categoryId || activeCategory);
      setTitle(item.title || '');
      setContent(item.content || '');
      setStatus(item.status || 'Draft');
      setPriority(item.priority || 'Medium');
      setDraftAttachments(getNormalizedAttachments(item));
      setLocation(item.location || '');
      setDateTag(item.dateTag || formatTimestamp());
      setNotes(item.notes || '');
      setAnswers(item.answers || '');
      setIsHighlightedAnswer(item.isHighlightedAnswer || false);
      setSaveErrorMessage(null);
      setAutoSaveStatus('idle');
    }
  }, [item, activeCategory]);

  // Debounced auto-save if editing existing item (without closing the modal!)
  useEffect(() => {
    if (!item) return; // Only auto-save existing records, new items saved on Submit

    const currentAtts = getNormalizedAttachments(item);
    const hasAttChange =
      JSON.stringify(draftAttachments.map((a) => a.id)) !==
      JSON.stringify(currentAtts.map((a) => a.id));

    const hasChanges =
      title !== item.title ||
      content !== item.content ||
      selectedCategoryId !== item.categoryId ||
      (status || 'Draft') !== (item.status || 'Draft') ||
      (priority || 'Medium') !== (item.priority || 'Medium') ||
      hasAttChange ||
      (location || '') !== (item.location || '') ||
      (notes || '') !== (item.notes || '') ||
      (answers || '') !== (item.answers || '') ||
      isHighlightedAnswer !== Boolean(item.isHighlightedAnswer);

    if (!hasChanges || !title.trim()) return;

    if (isOverSizeLimit) {
      setAutoSaveStatus('error');
      setSaveErrorMessage(`Attachment size (${attachmentSizeKB} KB) exceeds 950 KB limit.`);
      return;
    }

    isUserTypingRef.current = true;
    hasEverTypedRef.current = true;
    setAutoSaveStatus('unsaved');
    setSaveErrorMessage(null);

    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const primaryMedia = draftAttachments[0];
      const savedItem: CoreTopicItem = {
        ...item,
        categoryId: selectedCategoryId,
        title: title.trim(),
        content: content.trim(),
        timestamp: item.timestamp || formatTimestamp(),
        dateTag: dateTag.trim() || undefined,
        status: categoryConfig?.hasDraftTracking ? status : status || undefined,
        priority: priority || undefined,
        attachments: draftAttachments,
        mediaUrl: primaryMedia?.url?.startsWith('data:') ? undefined : primaryMedia?.url,
        mediaType: primaryMedia?.type || undefined,
        mediaCaption: primaryMedia?.caption || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        answers: answers.trim() || undefined,
        isHighlightedAnswer,
        updatedAt: new Date().toISOString(),
      };

      try {
        await onSave(savedItem, false);
        setAutoSaveStatus('saved');
        setSaveErrorMessage(null);
        isUserTypingRef.current = false;
      } catch (err: any) {
        console.error('[Auto-Save ERROR] Failed to save entry:', err);
        setAutoSaveStatus('error');
        setSaveErrorMessage(err?.message || 'Failed to save to cloud');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    item,
    title,
    content,
    selectedCategoryId,
    status,
    priority,
    draftAttachments,
    location,
    dateTag,
    notes,
    answers,
    isHighlightedAnswer,
    categoryConfig,
    onSave,
    isOverSizeLimit,
    attachmentSizeKB,
  ]);

  // Flush on unmount if pending changes
  useEffect(() => {
    return () => {
      if (isUserTypingRef.current && item && title.trim() && !isOverSizeLimit) {
        const primaryMedia = draftAttachments[0];
        const savedItem: CoreTopicItem = {
          ...item,
          categoryId: selectedCategoryId,
          title: title.trim(),
          content: content.trim(),
          timestamp: item.timestamp || formatTimestamp(),
          dateTag: dateTag.trim() || undefined,
          status: categoryConfig?.hasDraftTracking ? status : status || undefined,
          priority: priority || undefined,
          attachments: draftAttachments,
          mediaUrl: primaryMedia?.url?.startsWith('data:') ? undefined : primaryMedia?.url,
          mediaType: primaryMedia?.type || undefined,
          mediaCaption: primaryMedia?.caption || undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          answers: answers.trim() || undefined,
          isHighlightedAnswer,
          updatedAt: new Date().toISOString(),
        };
        try {
          onSave(savedItem, false);
        } catch {}
      }
    };
  }, [answers, categoryConfig?.hasDraftTracking, content, dateTag, draftAttachments, isHighlightedAnswer, isOverSizeLimit, item, location, notes, onSave, priority, selectedCategoryId, status, title]);

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const hasHeic = Array.from(files).some(
        (f: File) =>
          f.type === 'image/heic' ||
          f.type === 'image/heif' ||
          f.name.toLowerCase().endsWith('.heic') ||
          f.name.toLowerCase().endsWith('.heif')
      );
      setUploadStatus(hasHeic ? 'converting' : 'uploading');

      const newAtts = await filesToPersistentAttachments(files, (status) => {
        setUploadStatus(status);
      });
      setDraftAttachments((prev) => [...prev, ...newAtts]);
    } catch (err: any) {
      console.error('Failed to upload files to Cloud Storage:', err);
      setAutoSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Failed to upload media');
    } finally {
      setUploadStatus('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    const att = createAttachmentFromUrl(urlInput.trim());
    setDraftAttachments((prev) => [...prev, att]);
    setUrlInput('');
  };

  const handleRemoveAttachment = (idToRemove: string) => {
    setDraftAttachments((prev) => prev.filter((a) => a.id !== idToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isOverSizeLimit) {
      setAutoSaveStatus('error');
      setSaveErrorMessage(`Attachment size (${attachmentSizeKB} KB) exceeds the safe 950 KB limit. Please remove an attachment before saving.`);
      return;
    }

    const primaryMedia = draftAttachments[0];
    const savedItem: CoreTopicItem = {
      id: item?.id || 'core-' + Date.now(),
      categoryId: selectedCategoryId,
      title: title.trim(),
      content: content.trim(),
      timestamp: item?.timestamp || formatTimestamp(),
      dateTag: dateTag.trim() || undefined,
      status: categoryConfig?.hasDraftTracking ? status : status || undefined,
      priority: priority || undefined,
      attachments: draftAttachments,
      mediaUrl: primaryMedia?.url?.startsWith('data:') ? undefined : primaryMedia?.url,
      mediaType: primaryMedia?.type || undefined,
      mediaCaption: primaryMedia?.caption || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      answers: answers.trim() || undefined,
      isHighlightedAnswer,
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setAutoSaveStatus('saving');
      await onSave(savedItem, true);
    } catch (err: any) {
      console.error('[Submit ERROR] Failed to save entry:', err);
      setAutoSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Failed to save entry to cloud');
    }
  };

  return (
    <div
      id="topic-item-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 overflow-y-auto"
      style={{
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        transform: 'translateZ(0)',
      }}
      onClick={onClose}
    >
      <div
        id={item?.id ? `topic-item-modal-${item.id}` : 'topic-item-modal'}
        data-item-id={item?.id}
        className="relative w-full max-w-lg bg-white dark:bg-[#141416] border border-stone-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
        style={{
          contain: 'layout paint',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2 shrink-0" />
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {item ? (canEdit ? 'Edit Entry' : 'View Entry') : 'Add New Entry'}
            </h3>
            {!canEdit && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 flex items-center gap-1">
                <Eye className="w-3 h-3 text-stone-400" />
                <span>{isCommenter ? 'Commenting only' : 'View only'}</span>
              </span>
            )}
            {canEdit && (
              <SaveStatusBadge
                status={autoSaveStatus === 'unsaved' ? 'countdown' : autoSaveStatus}
                secondsRemaining={2}
                errorMessage={saveErrorMessage || undefined}
              />
            )}
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Box */}
        {(saveErrorMessage || isOverSizeLimit) && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">
                {isOverSizeLimit ? 'Attachment Size Limit Exceeded' : 'Save Error'}:
              </span>{' '}
              {saveErrorMessage ||
                `Attachment payload is ${attachmentSizeKB} KB. The safe limit is 700 KB to avoid Firestore data loss. Please remove large photos or videos before saving.`}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Target Topic Folder Selection */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-blue-500" />
              <span>Topic Folder</span>
            </label>
            <select
              value={selectedCategoryId}
              disabled={!canEdit}
              onChange={(e) => setSelectedCategoryId(e.target.value as CoreCategoryId)}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs font-semibold focus:outline-none disabled:opacity-75"
            >
              {coreCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  📁 {cat.title}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              readOnly={!canEdit}
              disabled={!canEdit}
              placeholder="e.g., Mom's Birthday Gift Idea, Book Recommendation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs font-semibold disabled:opacity-75"
            />
          </div>

          {/* Content / Details with Bulleted Note Editor */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Details & Notes (Type - or • to start bullet points)
            </label>
            <BulletedNoteEditor
              entryId={item?.id || 'new-item-draft'}
              value={content}
              onChange={(newVal) => {
                if (canEdit) setContent(newVal);
              }}
              readOnly={!canEdit}
              minRows={4}
              placeholder={canEdit ? "Add thoughts, key details, or bullet points..." : "No notes or bullet entries recorded."}
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-3">
            {categoryConfig?.hasDraftTracking ? (
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Shared">Shared</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Activity Status
                </label>
                <select
                  value={status || 'Active'}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
                >
                  <option value="Active">Active / Planned</option>
                  <option value="Done">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Date & Time Log Tag */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Date / Time Tag
            </label>
            <input
              type="text"
              placeholder="e.g. May 14, 2024 at 3:15 PM"
              value={dateTag}
              onChange={(e) => setDateTag(e.target.value)}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
            />
          </div>

          {/* Location (optional) */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Location / Context (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Downtown Cafe, Phone call..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
            />
          </div>

          {/* Therapist Notes / Answers (if questions or reflections) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">
                Answers / Therapist Notes / Insights (optional)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 dark:text-stone-300 text-[11px] min-h-[36px]">
                <input
                  type="checkbox"
                  checked={isHighlightedAnswer}
                  onChange={(e) => setIsHighlightedAnswer(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Highlight Box</span>
              </label>
            </div>
            <div
              className="w-full relative transform-gpu typing-isolation-container"
              style={{
                contain: 'layout paint',
                willChange: 'contents',
                transform: 'translateZ(0)',
              }}
            >
              <textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = `${Math.max(56, el.scrollHeight)}px`;
                  }
                }}
                placeholder="Her answers, therapist suggestions, or personal takeaways..."
                value={answers}
                onChange={(e) => {
                  setAnswers(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                rows={2}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs leading-relaxed resize-none overflow-hidden min-h-[56px]"
              />
            </div>
          </div>

          {/* Media Attachments (Photos / Videos) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-stone-700 dark:text-stone-300">
                Media Attachments ({draftAttachments.length})
                {attachmentSizeKB > 0 && (
                  <span className={`ml-1.5 text-[11px] font-mono font-normal ${isOverSizeLimit ? 'text-rose-600 font-bold' : 'text-stone-400'}`}>
                    ({attachmentSizeKB} KB / 700 KB max)
                  </span>
                )}
              </label>
              {draftAttachments.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInspectModal(true);
                  }}
                  className="text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer pointer-events-auto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect All ({draftAttachments.length})</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Paste photo or video URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                className="flex-1 min-w-[180px] p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="min-h-[44px] px-3 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl font-bold text-xs"
              >
                Add URL
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isProcessingUpload}
                className="cursor-pointer min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs disabled:opacity-50"
              >
                {isProcessingUpload ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>
                  {uploadStatus === 'converting'
                    ? 'Converting...'
                    : uploadStatus === 'uploading'
                    ? 'Uploading to Storage...'
                    : 'Upload Media & Docs'}
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
            </div>

            {/* Thumbnail Carousel / List */}
            {draftAttachments.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                {draftAttachments.map((att) => {
                  const isPdf = isPdfMedia(att.url, att.type);
                  const isVid = !isPdf && isVideoMedia(att.url, att.type);
                  return (
                    <div
                      key={att.id}
                      className="relative group rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 aspect-square bg-stone-950"
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
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sky-400">
                              <Play className="w-4 h-4 fill-current drop-shadow-sm" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sky-400 bg-stone-900">
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
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow-xs hover:scale-110 transition-transform"
                        title="Remove attachment"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-bold text-sm sm:text-xs cursor-pointer"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={isOverSizeLimit || isProcessingUpload}
                className={`min-h-[44px] px-5 py-2 rounded-xl font-bold text-sm sm:text-xs shadow-2xs transition-colors cursor-pointer ${
                  isOverSizeLimit || isProcessingUpload
                    ? 'bg-stone-400 cursor-not-allowed text-stone-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {item ? 'Save Changes' : 'Create Entry'}
              </button>
            )}
          </div>
        </form>
      </div>

      {showInspectModal && draftAttachments.length > 0 && (
        <MediaInspectModal
          isOpen={showInspectModal}
          attachments={draftAttachments}
          canEdit={canEdit}
          title={title || 'Topic Entry Media'}
          onClose={() => setShowInspectModal(false)}
          onDeleteAttachment={(attId) => {
            setDraftAttachments((prev) => prev.filter((a) => a.id !== attId));
          }}
          onUpdateCaption={(attId, caption) => {
            setDraftAttachments((prev) =>
              prev.map((a) => (a.id === attId ? { ...a, caption } : a))
            );
          }}
        />
      )}
    </div>
  );
});

TopicItemModal.displayName = 'TopicItemModal';
