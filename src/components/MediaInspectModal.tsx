import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FileVideo,
  Film,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AccentTheme, Attachment } from '../types';
import { ACCENT_THEMES } from '../utils/theme';
import { filesToPersistentAttachments, isPdfMedia, isVideoMedia } from '../utils/mediaUtils';
import { sanitizeUrl } from '../utils/security';

export interface MediaInspectModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  initialTitle?: string;
  subtitle?: string;
  attachments: Attachment[];
  onAddAttachments?: (newAttachments: Attachment[]) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  onUpdateCaption?: (attachmentId: string, caption: string) => void;
  canEdit?: boolean;
  accentTheme?: AccentTheme;
  initialIndex?: number;
}

export const MediaInspectModal: React.FC<MediaInspectModalProps> = ({
  isOpen = true,
  onClose,
  title,
  initialTitle,
  subtitle,
  attachments = [],
  onAddAttachments,
  onRemoveAttachment,
  onDeleteAttachment,
  onUpdateCaption,
  canEdit = false,
  accentTheme = 'amber',
  initialIndex = 0,
}) => {
  const modalTitle = title || initialTitle || 'Attachments Gallery';
  const handleRemove = onRemoveAttachment || onDeleteAttachment;
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState<'focused' | 'grid'>('focused');
  const [copied, setCopied] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'converting' | 'uploading'>('idle');
  const isUploading = uploadStatus !== 'idle';
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected index safely
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < attachments.length) {
      setSelectedIndex(initialIndex);
    } else if (attachments.length > 0) {
      setSelectedIndex(0);
    }
  }, [initialIndex, attachments.length]);

  const currentAttachment = attachments[selectedIndex] || attachments[0];

  useEffect(() => {
    if (currentAttachment) {
      setCaptionDraft(currentAttachment.caption || '');
    }
  }, [currentAttachment]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, attachments.length, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!currentAttachment) return;
    navigator.clipboard.writeText(currentAttachment.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onAddAttachments) return;

    try {
      const hasHeic = Array.from(files).some(
        (f: File) =>
          f.type === 'image/heic' ||
          f.type === 'image/heif' ||
          f.name.toLowerCase().endsWith('.heic') ||
          f.name.toLowerCase().endsWith('.heif')
      );
      setUploadStatus(hasHeic ? 'converting' : 'uploading');

      const newItems = await filesToPersistentAttachments(files, (status) => {
        setUploadStatus(status);
      });
      onAddAttachments(newItems);
      // Select the newly added attachment
      setSelectedIndex(attachments.length);
    } catch (err) {
      console.error('Failed to upload attachments:', err);
    } finally {
      setUploadStatus('idle');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveCaption = () => {
    if (!currentAttachment || !onUpdateCaption) return;
    onUpdateCaption(currentAttachment.id, captionDraft);
    setEditingCaption(false);
  };

  const isCurrentPdf = currentAttachment ? isPdfMedia(currentAttachment.url, currentAttachment.type) : false;
  const isCurrentVideo = currentAttachment && !isCurrentPdf ? isVideoMedia(currentAttachment.url, currentAttachment.type) : false;

  const modalContent = (
    <div
      id="media-inspect-modal-overlay"
      className="fixed inset-0 z-[99999] bg-[#0f0f11]/95 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3.5 bg-stone-950/90 border-b border-stone-800 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className={`p-2 rounded-xl ${currentAccent.iconBox} ${currentAccent.textPrimary} shrink-0`}>
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-100 truncate">
                  {modalTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-stone-300 shrink-0">
                  {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              {subtitle && (
                <p className="text-xs text-stone-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle */}
            {attachments.length > 1 && (
              <div className="flex items-center bg-stone-800/80 rounded-xl p-0.5 border border-stone-700/50">
                <button
                  type="button"
                  onClick={() => setViewMode('focused')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'focused'
                      ? 'bg-stone-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Viewer
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-stone-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Grid
                </button>
              </div>
            )}

            {/* Add More Media Button */}
            {canEdit && onAddAttachments && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${currentAccent.buttonPrimary} text-white text-xs font-semibold shadow-2xs hover:opacity-90 transition-all cursor-pointer`}
                  title="Upload photos, videos, or PDFs"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {uploadStatus === 'converting'
                      ? 'Converting...'
                      : uploadStatus === 'uploading'
                      ? 'Uploading...'
                      : 'Add Files'}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,image/heic,image/heif,.heic,.heif,video/*,application/pdf"
                  onChange={handleFilesUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </>
            )}

            {/* Copy Link */}
            {currentAttachment && (
              <button
                type="button"
                onClick={handleCopyLink}
                title="Copy media URL"
                className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors border border-stone-700/60 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close modal (Esc)"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {attachments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
            <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center text-stone-500 mb-3">
              <ImageIcon className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-stone-200">No attachments found</p>
            <p className="text-xs text-stone-400 mt-1 max-w-sm">
              Upload photos, videos, or PDF documents from your device to keep memories and notes safely attached.
            </p>
            {canEdit && onAddAttachments && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`mt-4 px-4 py-2 rounded-xl ${currentAccent.buttonPrimary} text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Media & Docs</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Mode */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-max">
            {attachments.map((att, idx) => {
              const isPdf = isPdfMedia(att.url, att.type);
              const isVid = !isPdf && isVideoMedia(att.url, att.type);
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={att.id || idx}
                  onClick={() => {
                    setSelectedIndex(idx);
                    setViewMode('focused');
                  }}
                  className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer aspect-square bg-stone-950 flex flex-col ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : 'border-stone-800 hover:border-stone-600'
                  }`}
                >
                  {isPdf ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center bg-stone-900 text-rose-500 p-4 text-center select-none">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-rose-400" />
                      </div>
                      <span className="text-xs font-semibold text-stone-200 truncate max-w-full px-1">
                        {att.name || 'PDF Document'}
                      </span>
                      <span className="mt-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-bold text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                        PDF
                      </span>
                    </div>
                  ) : isVid ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-stone-950">
                      {att.thumbnailUrl ? (
                        <img
                          src={att.thumbnailUrl}
                          alt={att.name || 'Video attachment'}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <video
                          src={att.url}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 text-stone-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      </div>
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-sky-300 border border-white/10 flex items-center gap-1">
                        <Video className="w-3 h-3" /> VIDEO
                      </span>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      <img
                        src={att.url}
                        alt={att.name || att.caption || 'Attachment'}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Thumbnail Overlay Badge */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-[11px] text-stone-200">
                    <span className="truncate pr-2 font-medium">{att.name || `Item ${idx + 1}`}</span>
                    {canEdit && handleRemove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(att.id);
                        }}
                        className="p-1 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete attachment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Focused Stage View Mode */
          <div className="flex-1 flex flex-col min-h-0 bg-stone-950/60">
            {/* Active Display Stage */}
            <div className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden min-h-0">
              {/* Carousel Left / Right Navigation */}
              {attachments.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
                    }}
                    className="absolute left-2 sm:left-4 z-20 p-2.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border border-white/10 shadow-lg transition-all cursor-pointer"
                    title="Previous media (Left Arrow)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 sm:right-4 z-20 p-2.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border border-white/10 shadow-lg transition-all cursor-pointer"
                    title="Next media (Right Arrow)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Media Element */}
              {currentAttachment && (
                <div className="relative w-full h-full flex items-center justify-center max-w-full max-h-full">
                  {isCurrentPdf ? (
                    <iframe
                      key={currentAttachment.id || currentAttachment.url}
                      src={currentAttachment.url}
                      className="w-full h-full rounded-2xl bg-white border-0 shadow-2xl"
                      title={currentAttachment.name || currentAttachment.caption || 'PDF Document'}
                    />
                  ) : isCurrentVideo ? (
                    <video
                      key={currentAttachment.id || currentAttachment.url}
                      src={currentAttachment.url}
                      controls
                      autoPlay
                      className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain bg-black"
                    />
                  ) : (
                    <img
                      key={currentAttachment.id || currentAttachment.url}
                      src={currentAttachment.url}
                      alt={currentAttachment.name || currentAttachment.caption || 'Attachment preview'}
                      className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl select-none"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Bottom Meta & Caption Bar */}
            {currentAttachment && (
              <div className="px-4 py-2.5 bg-stone-950/90 border-t border-stone-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                    {selectedIndex + 1} / {attachments.length}
                  </span>
                  
                  {editingCaption ? (
                    <div
                      className="flex items-center gap-1.5 flex-1 min-w-0 typing-isolation-container"
                      style={{
                        contain: 'layout paint',
                        willChange: 'contents',
                        transform: 'translateZ(0)',
                      }}
                    >
                      <input
                        type="text"
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        placeholder="Add a caption for this media..."
                        className="p-1.5 px-2.5 text-xs bg-stone-900 border border-stone-700 rounded-lg text-stone-100 flex-1 min-w-[180px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCaption();
                          if (e.key === 'Escape') setEditingCaption(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveCaption}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCaption(false)}
                        className="px-2 py-1.5 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-xs text-stone-300 truncate max-w-md">
                        {currentAttachment.caption || currentAttachment.name || 'Untitled Attachment'}
                      </p>
                      {canEdit && onUpdateCaption && (
                        <button
                          type="button"
                          onClick={() => setEditingCaption(true)}
                          className="text-[11px] text-amber-400/80 hover:text-amber-300 underline shrink-0 cursor-pointer"
                        >
                          {currentAttachment.caption ? 'Edit caption' : '+ Add caption'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <a
                    href={sanitizeUrl(currentAttachment.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs border border-stone-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open full-res</span>
                  </a>

                  {canEdit && handleRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextIndex =
                          selectedIndex > 0 && selectedIndex === attachments.length - 1
                            ? selectedIndex - 1
                            : selectedIndex;
                        handleRemove(currentAttachment.id);
                        setSelectedIndex(nextIndex);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs border border-rose-500/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Horizontal Thumbnails Strip */}
            {attachments.length > 1 && (
              <div className="p-2 sm:p-2.5 bg-stone-950 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-thin">
                {attachments.map((att, idx) => {
                  const isPdf = isPdfMedia(att.url, att.type);
                  const isVid = !isPdf && isVideoMedia(att.url, att.type);
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      type="button"
                      key={att.id || idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                          : 'border-stone-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {isPdf ? (
                        <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center text-rose-500 p-1 text-center select-none">
                          <FileText className="w-5 h-5 mb-0.5" />
                          <span className="text-[8px] font-bold text-stone-300">PDF</span>
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
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-3.5 h-3.5 fill-current text-white drop-shadow-sm" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                            <Video className="w-5 h-5 text-sky-400" />
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
