import {
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  HeartHandshake,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  MessageSquare,
  Pencil,
  Pin,
  Play,
  Trash2,
  User,
  Users,
  Video,
} from 'lucide-react';
import React, { useState } from 'react';
import { AccentTheme, CoreTopicItem, ItemActivityStatus } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { LightboxMedia, MediaLightboxModal } from '../MediaLightboxModal';
import { HighlightText } from '../HighlightText';
import { BulletedNoteEditor } from './BulletedNoteEditor';
import { getNormalizedAttachments, isPdfMedia, isVideoMedia } from '../../utils/mediaUtils';
import { MediaInspectModal } from '../MediaInspectModal';

interface TopicCategoryCardProps {
  item: CoreTopicItem;
  onEdit: (item: CoreTopicItem) => void;
  onDelete: (id: string) => void;
  onToggleComplete?: (item: CoreTopicItem) => void;
  onUpdateStatus?: (item: CoreTopicItem, newStatus: ItemActivityStatus) => void;
  onNavigateToWeek?: (weekId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isOwner?: boolean;
  onOpenCommentSection?: (sectionTag: string) => void;
  activeCommentSectionTag?: string;
  searchQuery?: string;
  accentTheme?: AccentTheme;
}

export const TopicCategoryCard: React.FC<TopicCategoryCardProps> = React.memo(({
  item,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateStatus,
  onNavigateToWeek,
  canEdit = false,
  canDelete = false,
  isOwner = false,
  onOpenCommentSection,
  activeCommentSectionTag,
  searchQuery,
  accentTheme = 'amber',
}) => {
  const [copied, setCopied] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<LightboxMedia | null>(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  const attachments = getNormalizedAttachments(item);

  const isHighlighted =
    activeCommentSectionTag &&
    (activeCommentSectionTag.toLowerCase().includes(item.title.toLowerCase().slice(0, 15)) ||
      item.title.toLowerCase().includes(activeCommentSectionTag.toLowerCase().replace('item: "', '').replace('"', '').slice(0, 15)));

  const handleCopyText = () => {
    navigator.clipboard.writeText(item.content || item.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWatchlistCategory =
    item.categoryId === 'things-i-want-to-do-together' ||
    item.categoryId === 'my-hobbies' ||
    item.categoryId === 'things-i-want-to-do' ||
    item.categoryId === 'foods-to-try' ||
    item.status === 'To Watch/Read' ||
    item.status === 'Done Alone' ||
    item.status === 'Done Together';

  const statusColor =
    item.status === 'Ready to Send'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : item.status === 'Sent'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
      : item.status === 'Decided Not To Send'
      ? 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
      : item.status === 'Completed'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : item.status === 'To Watch/Read'
      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
      : item.status === 'Done Alone'
      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
      : item.status === 'Done Together'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
        isHighlighted
          ? 'bg-sky-50/70 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 ring-2 ring-sky-400/50 shadow-md'
          : item.isHighlightedAnswer
          ? `${currentAccent.iconBoxSelected} ${currentAccent.activeBorder} shadow-xs`
          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
      }`}
    >
      {/* Pinned From Weekly Journal Header Badge */}
      {item.pinnedFromWeekTitle && (
        <div className={`flex items-center justify-between gap-2 p-2 mb-3 rounded-xl text-xs font-bold ${currentAccent.tagBadge}`}>
          <div className="flex items-center gap-1.5">
            <Pin className={`w-3.5 h-3.5 ${currentAccent.textPrimary}`} />
            <span>Pinned Growth Takeaway from <HighlightText text={item.pinnedFromWeekTitle} highlight={searchQuery} /></span>
          </div>
          {item.pinnedFromWeekId && onNavigateToWeek && (
            <button
              onClick={() => onNavigateToWeek(item.pinnedFromWeekId!)}
              className={`text-[11px] hover:underline flex items-center gap-0.5 ${currentAccent.textPrimary}`}
            >
              <span>View Week</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Header & Badges */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
            <HighlightText text={item.title} highlight={searchQuery} />
          </h3>

          {isHighlighted && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
              Active Comment Area
            </span>
          )}

          {item.status && !isWatchlistCategory && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>
              {item.status}
            </span>
          )}

          {item.priority && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              Priority: {item.priority}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Copy Button for Text Messages or Drafts */}
          {item.content && (
            <button
              onClick={handleCopyText}
              title="Copy entry text to clipboard"
              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          )}

          {/* Toggle Complete Checkbox */}
          {onToggleComplete && canEdit && !isWatchlistCategory && (
            <button
              onClick={() => onToggleComplete(item)}
              title="Toggle mark complete"
              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${item.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
              <span className="text-[10px]">{item.status === 'Completed' ? 'Done' : 'Mark Done'}</span>
            </button>
          )}

          {onOpenCommentSection && (
            <button
              onClick={() => onOpenCommentSection(`Item: "${item.title.slice(0, 25)}"`)}
              title="Add comment or feedback for this item"
              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span className="text-[10px]">Comment</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onEdit(item)}
              title="Edit this entry"
              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="text-[10px]">Edit</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => onDelete(item.id)}
              title="Delete this entry"
              className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-[10px]">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Watchlist / Reading Status Tag Selector (Requirement 4) */}
      {isWatchlistCategory && (
        <div className="flex flex-wrap items-center gap-1.5 my-2.5 p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-700">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mr-1 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-stone-400" />
            Status:
          </span>

          <button
            onClick={() => onUpdateStatus?.(item, 'To Watch/Read')}
            disabled={!canEdit}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              item.status === 'To Watch/Read'
                ? 'bg-sky-600 text-white shadow-2xs scale-102'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-sky-50 border border-stone-200 dark:border-stone-700'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>To Watch/Read</span>
          </button>

          <button
            onClick={() => onUpdateStatus?.(item, 'Done Alone')}
            disabled={!canEdit}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              item.status === 'Done Alone'
                ? 'bg-indigo-600 text-white shadow-2xs scale-102'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-stone-200 dark:border-stone-700'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Done Alone</span>
          </button>

          <button
            onClick={() => onUpdateStatus?.(item, 'Done Together')}
            disabled={!canEdit}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              item.status === 'Done Together'
                ? 'bg-emerald-600 text-white shadow-2xs scale-102'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-emerald-50 border border-stone-200 dark:border-stone-700'
            }`}
          >
            <HeartHandshake className="w-3 h-3" />
            <span>Done Together</span>
          </button>
        </div>
      )}

      {/* Main Content Body with Apple-style Bullet Rendering */}
      {item.content && (
        <div className="mb-3">
          <BulletedNoteEditor
            value={item.content}
            onChange={() => {}}
            readOnly={true}
            searchQuery={searchQuery}
          />
        </div>
      )}

      {/* Therapist Answers Callout */}
      {item.answers && (
        <div
          className={`p-3 rounded-xl mb-3 text-xs border ${
            item.isHighlightedAnswer
              ? `${currentAccent.iconBoxSelected} ${currentAccent.activeBorder} text-stone-900 dark:text-stone-100 font-medium`
              : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
          }`}
        >
          <div className={`flex items-center gap-1.5 font-bold mb-1 ${currentAccent.textPrimary}`}>
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Therapist Des / Highlight Answer:</span>
          </div>
          <p className="leading-relaxed">
            <HighlightText text={item.answers} highlight={searchQuery} />
          </p>
        </div>
      )}

      {/* Compact Multi-Media Attachments Trigger / Carousel */}
      {attachments.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2 p-2 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/80 dark:border-stone-800">
            {/* Direct Inspect Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInspectModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-2xs transition-colors cursor-pointer pointer-events-auto"
            >
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>Inspect Media ({attachments.length})</span>
            </button>

            {/* Micro Thumbnails Carousel */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {attachments.slice(0, 3).map((att) => {
                const isPdf = isPdfMedia(att.url, att.type);
                const isVid = !isPdf && isVideoMedia(att.url, att.type);
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInspectModal(true);
                    }}
                    className="relative w-9 h-9 rounded-lg overflow-hidden border border-stone-300 dark:border-stone-700 bg-stone-950 shrink-0 group hover:opacity-90 transition-opacity cursor-pointer pointer-events-auto"
                    title={att.caption || 'Click to view'}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-800 text-rose-500 p-0.5 text-center">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-[7px] font-bold text-stone-600 dark:text-stone-300">
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
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sky-400">
                            <Play className="w-3 h-3 fill-current drop-shadow-sm" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-900 text-sky-400">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      )
                    ) : (
                      <img
                        src={att.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </button>
                );
              })}

              {attachments.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInspectModal(true);
                  }}
                  className="px-2 h-9 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer pointer-events-auto"
                >
                  +{attachments.length - 3} more
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Meta (Timestamp, Location, Tags) */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 font-mono gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 opacity-70" />
            {item.timestamp}
          </span>
          {item.location && (
            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-sans">
              <MapPin className="w-3 h-3 opacity-70" />
              {item.location}
            </span>
          )}
        </div>

        {item.dateTag && (
          <span className="bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Tag: <HighlightText text={item.dateTag} highlight={searchQuery} /></span>
          </span>
        )}
      </div>

      {/* Semi-Full-Screen Centered Media Lightbox with Blurred Background */}
      <MediaLightboxModal media={previewMedia} onClose={() => setPreviewMedia(null)} />

      {/* Multi-Media Full Inspection Gallery Modal */}
      {showInspectModal && attachments.length > 0 && (
        <MediaInspectModal
          isOpen={showInspectModal}
          attachments={attachments}
          canEdit={canEdit}
          title={item.title}
          accentTheme={accentTheme}
          onClose={() => setShowInspectModal(false)}
        />
      )}
    </div>
  );
});
