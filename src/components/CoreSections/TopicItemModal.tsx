import { Check, Clock, Folder, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { CORE_CATEGORIES_CONFIG } from '../../data/initialData';
import { CoreCategoryConfig, CoreCategoryId, CoreTopicItem } from '../../types';
import { formatTimestamp } from '../../utils/storage';
import { BulletedNoteEditor } from './BulletedNoteEditor';

interface TopicItemModalProps {
  item?: CoreTopicItem | null;
  activeCategory: CoreCategoryId;
  coreCategories?: CoreCategoryConfig[];
  onSave: (item: CoreTopicItem) => void;
  onClose: () => void;
}

export const TopicItemModal: React.FC<TopicItemModalProps> = ({
  item,
  activeCategory,
  coreCategories = CORE_CATEGORIES_CONFIG,
  onSave,
  onClose,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<CoreCategoryId>(
    item?.categoryId || activeCategory
  );
  const categoryConfig = coreCategories.find((c) => c.id === selectedCategoryId) || coreCategories[0];

  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');
  const [status, setStatus] = useState<any>(item?.status || 'Draft');
  const [priority, setPriority] = useState<any>(item?.priority || 'Medium');
  const [mediaUrl, setMediaUrl] = useState(item?.mediaUrl || '');
  const [location, setLocation] = useState(item?.location || '');
  // Auto-fill date & time tag if new entry
  const [dateTag, setDateTag] = useState(item?.dateTag || formatTimestamp());
  const [notes, setNotes] = useState(item?.notes || '');
  const [answers, setAnswers] = useState(item?.answers || '');
  const [isHighlightedAnswer, setIsHighlightedAnswer] = useState(item?.isHighlightedAnswer || false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');

  // Debounced auto-save if editing existing item
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!item) return; // Only auto-save existing records, new items saved on Submit

    const hasChanges =
      title !== item.title ||
      content !== item.content ||
      selectedCategoryId !== item.categoryId ||
      (status || 'Draft') !== (item.status || 'Draft') ||
      (priority || 'Medium') !== (item.priority || 'Medium') ||
      (mediaUrl || '') !== (item.mediaUrl || '') ||
      (location || '') !== (item.location || '') ||
      (notes || '') !== (item.notes || '') ||
      (answers || '') !== (item.answers || '') ||
      isHighlightedAnswer !== Boolean(item.isHighlightedAnswer);

    if (!hasChanges || !title.trim()) return;

    isTypingRef.current = true;
    setAutoSaveStatus('unsaved');

    const timer = setTimeout(() => {
      setAutoSaveStatus('saving');
      const savedItem: CoreTopicItem = {
        ...item,
        categoryId: selectedCategoryId,
        title: title.trim(),
        content: content.trim(),
        timestamp: item.timestamp || formatTimestamp(),
        dateTag: dateTag.trim() || undefined,
        status: categoryConfig?.hasDraftTracking ? status : status || undefined,
        priority: priority || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl.trim() ? 'image' : undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        answers: answers.trim() || undefined,
        isHighlightedAnswer,
        updatedAt: new Date().toISOString(),
      };

      onSave(savedItem);
      setAutoSaveStatus('saved');
      isTypingRef.current = false;
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    item,
    title,
    content,
    selectedCategoryId,
    status,
    priority,
    mediaUrl,
    location,
    dateTag,
    notes,
    answers,
    isHighlightedAnswer,
    categoryConfig,
    onSave,
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const savedItem: CoreTopicItem = {
      id: item?.id || 'core-' + Date.now(),
      categoryId: selectedCategoryId,
      title: title.trim(),
      content: content.trim(),
      timestamp: item?.timestamp || formatTimestamp(),
      dateTag: dateTag.trim() || undefined,
      status: categoryConfig?.hasDraftTracking ? status : status || undefined,
      priority: priority || undefined,
      mediaUrl: mediaUrl.trim() || undefined,
      mediaType: mediaUrl.trim() ? 'image' : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      answers: answers.trim() || undefined,
      isHighlightedAnswer,
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedItem);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full space-y-4 max-h-[90dvh] overflow-y-auto relative pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2 shrink-0" />
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {item ? 'Edit Entry' : 'Add New Entry'}
            </h3>
            {autoSaveStatus === 'unsaved' && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 animate-pulse" />
                <span>Auto-saving in 2s...</span>
              </span>
            )}
            {autoSaveStatus === 'saving' && (
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Target Topic Folder Selection */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-blue-500" />
              <span>Topic Folder</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value as CoreCategoryId)}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs font-semibold focus:outline-none"
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
              Title / Subject
            </label>
            <input
              type="text"
              placeholder="e.g., Thoughtful Check-in Draft..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs font-semibold focus:outline-none"
            />
          </div>

          {/* Main Content */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Content & Bullet Notes
            </label>
            <div className="p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl">
              <BulletedNoteEditor
                value={content}
                onChange={setContent}
                minRows={4}
                placeholder="Write thoughts, message drafts, reflections, or type - or • for bullets..."
              />
            </div>
          </div>

          {/* Status & Priority Fields */}
          <div className="grid grid-cols-2 gap-3">
            {categoryConfig?.hasDraftTracking ? (
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Draft Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Ready to Send">Ready to Send</option>
                  <option value="Sent">Sent</option>
                  <option value="Decided Not To Send">Decided Not To Send</option>
                </select>
              </div>
            ) : selectedCategoryId === 'things-i-want-to-do-together' ||
              selectedCategoryId === 'my-hobbies' ||
              selectedCategoryId === 'things-i-want-to-do' ||
              selectedCategoryId === 'foods-to-try' ? (
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Activity Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
                >
                  <option value="To Watch/Read">To Do / To Try</option>
                  <option value="Done Alone">Done Alone</option>
                  <option value="Done Together">Done Together</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
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
            <textarea
              placeholder="Her answers, therapist suggestions, or personal takeaways..."
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              rows={2}
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs leading-relaxed"
            />
          </div>

          {/* Media Attachment (Photo / Document Image) */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Media Attachment (Photo / Screenshot)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Paste image URL (https://...)"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="flex-1 p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-base sm:text-xs"
              />
              <label className="cursor-pointer min-h-[44px] px-3.5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl font-bold flex items-center gap-1 shrink-0 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            {mediaUrl && (
              <div className="mt-2 relative inline-block">
                <img
                  src={mediaUrl}
                  alt="Attachment preview"
                  className="w-24 h-24 object-cover rounded-xl border border-stone-300 dark:border-stone-700 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-xs min-h-[28px] min-w-[28px] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-bold text-sm sm:text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm sm:text-xs shadow-2xs"
            >
              {item ? 'Save Changes' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
