import {
  Check,
  Copy,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Maximize2,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { sanitizeUrl } from '../utils/security';

export interface LightboxMedia {
  url: string;
  title?: string;
  caption?: string;
  type?: 'image' | 'video' | 'link';
  categoryLabel?: string;
  sourceTitle?: string;
  timestamp?: string;
  externalUrl?: string;
}

interface MediaLightboxModalProps {
  media: LightboxMedia | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ media, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!media || !media.url) return null;

  const url = media.url.trim();
  const lowerUrl = url.toLowerCase();

  // Video detection
  const isDirectVideo =
    media.type === 'video' ||
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.ogg') ||
    lowerUrl.endsWith('.mov');

  const isYouTube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
  const isVimeo = lowerUrl.includes('vimeo.com');

  const getYouTubeEmbedUrl = (ytUrl: string) => {
    try {
      if (ytUrl.includes('youtu.be/')) {
        const id = ytUrl.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (ytUrl.includes('watch?v=')) {
        const id = ytUrl.split('watch?v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (ytUrl.includes('embed/')) {
        return ytUrl;
      }
    } catch {
      return ytUrl;
    }
    return ytUrl;
  };

  const getVimeoEmbedUrl = (vimeoUrl: string) => {
    try {
      const match = vimeoUrl.match(/vimeo\.com\/(\d+)/);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
      }
    } catch {
      return vimeoUrl;
    }
    return vimeoUrl;
  };

  const handleCopyLink = () => {
    const target = media.externalUrl || media.url;
    navigator.clipboard.writeText(target);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="media-lightbox-overlay"
      className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-stone-900/95 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lightbox Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-stone-950/70 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-1.5 rounded-xl bg-stone-800 text-sky-400 shrink-0">
              {isDirectVideo || isYouTube || isVimeo ? (
                <Video className="w-4 h-4" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                {media.title || 'Media Viewer'}
              </h3>
              {(media.sourceTitle || media.categoryLabel) && (
                <p className="text-[11px] text-stone-400 truncate">
                  {media.categoryLabel || 'Shared Media'}
                  {media.sourceTitle ? ` • ${media.sourceTitle}` : ''}
                  {media.timestamp ? ` • ${media.timestamp}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {(media.externalUrl || media.url) && (
              <button
                onClick={handleCopyLink}
                title="Copy link"
                className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors border border-stone-700/60 text-xs flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-semibold">Copy URL</span>
                  </>
                )}
              </button>
            )}

            {(media.externalUrl || media.url) && (
              <a
                href={sanitizeUrl(media.externalUrl || media.url)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors border border-stone-700/60 text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Open</span>
              </a>
            )}

            <button
              onClick={onClose}
              title="Close viewer (Esc)"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lightbox Main Media Content Stage */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden min-h-[300px] max-h-[70vh] bg-stone-950/50">
          {isDirectVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-lg object-contain bg-black"
            />
          ) : isYouTube ? (
            <div className="w-full h-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-lg border border-stone-800 bg-black">
              <iframe
                src={getYouTubeEmbedUrl(media.url)}
                title={media.title || 'YouTube video'}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isVimeo ? (
            <div className="w-full h-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-lg border border-stone-800 bg-black">
              <iframe
                src={getVimeoEmbedUrl(media.url)}
                title={media.title || 'Vimeo video'}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center max-h-[65vh] max-w-full">
              <img
                src={media.url}
                alt={media.title || media.caption || 'Preview'}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-stone-800/80 select-none"
              />
            </div>
          )}
        </div>

        {/* Lightbox Caption / Description Footer */}
        {media.caption && (
          <div className="px-5 py-3.5 bg-stone-950/90 border-t border-stone-800/80 shrink-0">
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
              {media.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
