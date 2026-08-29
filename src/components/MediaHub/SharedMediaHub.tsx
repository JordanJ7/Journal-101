import {
  Bookmark,
  Calendar,
  Check,
  Copy,
  ExternalLink as LinkIcon,
  Film,
  FolderHeart,
  FolderOpen,
  Image as ImageIcon,
  Maximize2,
  Plus,
  Search,
  Share2,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import { AccentTheme, CoreTopicItem, ExternalLink, ItemActivityStatus, WeeklyBlock } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { sanitizeUrl } from '../../utils/security';
import { formatTimestamp } from '../../utils/storage';
import { getNormalizedAttachments } from '../../utils/mediaUtils';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { LightboxMedia, MediaLightboxModal } from '../MediaLightboxModal';
import { usePermissions } from '../../hooks/usePermissions';

interface SharedMediaHubProps {
  weeks: WeeklyBlock[];
  coreItems: CoreTopicItem[];
  currentUser: CurrentUserProfile;
  onUpdateWeeks: (weeks: WeeklyBlock[]) => void;
  onUpdateCoreItems: (items: CoreTopicItem[]) => void;
  onNavigateToWeek?: (weekId: string) => void;
  onNavigateToCoreCategory?: (catId: string) => void;
  accentTheme?: AccentTheme;
}

export type MediaFilterType = 'all' | 'apple-photos' | 'tiktok' | 'photos' | 'articles' | 'watchlist';

interface ExtractedMediaItem {
  id: string;
  title: string;
  url?: string;
  mediaUrl?: string;
  type: 'apple-photos' | 'tiktok' | 'photo' | 'video' | 'article' | 'watchlist';
  categoryLabel: string;
  sourceType: 'weekly' | 'core';
  sourceId: string;
  sourceTitle: string;
  timestamp: string;
  notes?: string;
  caption?: string;
  status?: ItemActivityStatus;
}

export const SharedMediaHub: React.FC<SharedMediaHubProps> = React.memo(({
  weeks,
  coreItems,
  currentUser,
  onUpdateWeeks,
  onUpdateCoreItems,
  onNavigateToWeek,
  onNavigateToCoreCategory,
  accentTheme = 'amber',
}) => {
  const [selectedFilter, setSelectedFilter] = useState<MediaFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<LightboxMedia | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'apple-photos' | 'tiktok' | 'photo' | 'article'>('apple-photos');
  const [newNotes, setNewNotes] = useState('');
  const [targetWeekId, setTargetWeekId] = useState(weeks[0]?.id || '');

  const permissions = usePermissions();
  const canEdit = permissions.canEdit || (currentUser?.role === 'owner' || currentUser?.role === 'editor');
  const canDelete = permissions.canDelete || (currentUser?.role === 'owner' || currentUser?.role === 'editor');

  // Aggregate media
  const allMediaItems = useMemo<ExtractedMediaItem[]>(() => {
    const list: ExtractedMediaItem[] = [];

    // 1. Weekly blocks
    weeks.forEach((week) => {
      week.therapistSection?.externalLinks?.forEach((link) => {
        const cat = (link.category || '').toLowerCase();
        const url = link.url.toLowerCase();
        let mediaType: ExtractedMediaItem['type'] = 'article';

        if (cat.includes('apple') || url.includes('photos.apple.com') || url.includes('icloud.com/sharedalbum')) {
          mediaType = 'apple-photos';
        } else if (cat.includes('tiktok') || url.includes('tiktok.com') || url.includes('youtube.com')) {
          mediaType = 'tiktok';
        } else {
          mediaType = 'article';
        }

        list.push({
          id: link.id,
          title: link.title,
          url: link.url,
          mediaUrl: link.thumbnailUrl,
          type: mediaType,
          categoryLabel: link.category || (mediaType === 'apple-photos' ? 'Apple Photos' : mediaType === 'tiktok' ? 'Video' : 'Article'),
          sourceType: 'weekly',
          sourceId: week.id,
          sourceTitle: week.weekTitle,
          timestamp: link.addedAt || week.startDate,
          notes: link.notes,
        });
      });

      // Bullets with media
      week.bullets?.forEach((bullet) => {
        const normAtts = getNormalizedAttachments(bullet);
        if (normAtts.length > 0) {
          normAtts.forEach((att, idx) => {
            list.push({
              id: `${bullet.id}_att_${att.id || idx}`,
              title: bullet.text || att.name || 'Journal Photo',
              mediaUrl: att.url,
              type: att.type === 'video' ? 'video' : 'photo',
              categoryLabel: att.type === 'video' ? 'Video' : 'Photo',
              sourceType: 'weekly',
              sourceId: week.id,
              sourceTitle: week.weekTitle,
              timestamp: bullet.timestamp || week.startDate,
              caption: att.caption || bullet.mediaCaption,
            });
          });
        }
      });
    });

    // 2. Core Topics
    coreItems.forEach((item) => {
      const normAtts = getNormalizedAttachments(item);
      if (normAtts.length > 0) {
        normAtts.forEach((att, idx) => {
          list.push({
            id: `${item.id}_att_${att.id || idx}`,
            title: item.title,
            mediaUrl: att.url,
            type: att.type === 'video' ? 'video' : 'photo',
            categoryLabel: att.type === 'video' ? 'Topic Video' : 'Topic Photo',
            sourceType: 'core',
            sourceId: item.categoryId,
            sourceTitle: item.categoryId,
            timestamp: item.dateTag || '',
            notes: item.content,
            status: item.status,
            caption: att.caption || item.mediaCaption,
          });
        });
      }

      if (item.categoryId === 'things-i-want-to-do-together' || item.categoryId === 'my-hobbies') {
        list.push({
          id: item.id + '-watch',
          title: item.title,
          type: 'watchlist',
          categoryLabel: 'Watchlist',
          sourceType: 'core',
          sourceId: item.categoryId,
          sourceTitle: item.categoryId,
          timestamp: item.dateTag || '',
          notes: item.content,
          status: item.status,
        });
      }
    });

    return list;
  }, [weeks, coreItems]);

  const counts = useMemo(() => {
    return {
      all: allMediaItems.length,
      applePhotos: allMediaItems.filter((m) => m.type === 'apple-photos').length,
      tiktok: allMediaItems.filter((m) => m.type === 'tiktok').length,
      photos: allMediaItems.filter((m) => m.type === 'photo').length,
      articles: allMediaItems.filter((m) => m.type === 'article').length,
      watchlist: allMediaItems.filter((m) => m.type === 'watchlist').length,
    };
  }, [allMediaItems]);

  const filteredMedia = useMemo(() => {
    return allMediaItems.filter((item) => {
      if (selectedFilter !== 'all' && item.type !== selectedFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inNotes = (item.notes || '').toLowerCase().includes(q);
        const inSource = item.sourceTitle.toLowerCase().includes(q);
        return inTitle || inNotes || inSource;
      }
      return true;
    });
  }, [allMediaItems, selectedFilter, searchQuery]);

  const handleFilterChange = (filter: MediaFilterType) => {
    setSelectedFilter(filter);
    setVisibleCount(24);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setVisibleCount(24);
  };

  const copyUrl = (id: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const targetWeek = weeks.find((w) => w.id === targetWeekId) || weeks[0];
    if (!targetWeek) return;

    const categoryLabel =
      newType === 'apple-photos'
        ? 'Apple Photos'
        : newType === 'tiktok'
        ? 'Video'
        : newType === 'photo'
        ? 'Photo'
        : 'Article';

    const newLink: ExternalLink = {
      id: 'ext-' + Date.now(),
      title: newTitle.trim(),
      url: newUrl.trim(),
      category: categoryLabel,
      notes: newNotes.trim() || undefined,
      thumbnailUrl: newType === 'photo' ? newUrl.trim() : undefined,
      addedAt: formatTimestamp(),
    };

    const updatedWeeks = weeks.map((w) => {
      if (w.id === targetWeek.id) {
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          therapistSection: {
            ...w.therapistSection,
            externalLinks: [newLink, ...(w.therapistSection?.externalLinks || [])],
          },
        };
      }
      return w;
    });

    onUpdateWeeks(updatedWeeks);
    setShowAddModal(false);
    setNewTitle('');
    setNewUrl('');
    setNewNotes('');
  };

  const { confirmDelete } = useConfirmDelete();

  const handleDeleteMedia = (item: ExtractedMediaItem) => {
    if (item.sourceType === 'weekly') {
      confirmDelete({
        title: 'Delete Media',
        message: `Delete "${item.title}"?`,
        confirmText: 'Delete',
        onConfirm: () => {
          const updatedWeeks = weeks.map((w) => {
            if (w.id === item.sourceId) {
              return {
                ...w,
                updatedAt: new Date().toISOString(),
                therapistSection: {
                  ...w.therapistSection,
                  externalLinks: (w.therapistSection?.externalLinks || []).filter((l) => l.id !== item.id),
                },
              };
            }
            return w;
          });
          onUpdateWeeks(updatedWeeks);
        },
      });
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-500" />
            <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              Shared Media
            </h1>
            <span className="text-xs text-stone-400 font-mono">
              ({counts.all})
            </span>
          </div>

          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className={`px-3 py-1.5 ${currentAccent.buttonPrimary} text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Media</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'apple-photos', label: 'Apple Photos', count: counts.applePhotos },
            { key: 'tiktok', label: 'Videos', count: counts.tiktok },
            { key: 'photos', label: 'Photos', count: counts.photos },
            { key: 'articles', label: 'Articles', count: counts.articles },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key as MediaFilterType)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === f.key
                  ? 'bg-black/10 dark:bg-white/15 text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-xs space-y-2">
          <Film className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            No Media Found
          </h3>
          {canEdit && (
            <div className="pt-2">
              <button
                onClick={() => setShowAddModal(true)}
                className={`px-3.5 py-1.5 ${currentAccent.buttonPrimary} text-white font-semibold text-xs rounded-xl shadow-xs transition-colors`}
              >
                + Add Media
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMedia.slice(0, visibleCount).map((item) => {
              const hasDirectImg = Boolean(item.mediaUrl);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between space-y-3 group hover:border-black/15 dark:hover:border-white/20 transition-all"
                >
                  {/* Thumbnail if photo */}
                  {hasDirectImg && (
                    <div
                      onClick={() =>
                        setPreviewMedia({
                          url: item.mediaUrl!,
                          title: item.title,
                          categoryLabel: item.categoryLabel,
                          sourceTitle: item.sourceTitle,
                          caption: item.caption,
                        })
                      }
                      className="relative aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer"
                    >
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 text-[10px] text-stone-400 font-mono">
                      <span className="font-semibold uppercase">{item.categoryLabel}</span>
                      <span>{item.timestamp}</span>
                    </div>

                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {item.title}
                    </h3>

                    {item.notes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
                    {item.sourceType === 'weekly' && onNavigateToWeek ? (
                      <button
                        onClick={() => onNavigateToWeek(item.sourceId)}
                        className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-medium truncate max-w-[120px]"
                      >
                        {item.sourceTitle}
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400 truncate max-w-[120px]">
                        {item.sourceTitle}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {item.url && (
                        <>
                          <button
                            onClick={() => copyUrl(item.id, item.url)}
                            title="Copy Link"
                            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={sanitizeUrl(item.url)}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Link"
                            className={`p-1 text-stone-400 hover:${currentAccent.textPrimary}`}
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}

                      {canDelete && item.sourceType === 'weekly' && (
                        <button
                          onClick={() => handleDeleteMedia(item)}
                          className="p-1 text-stone-400 hover:text-rose-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination / Load More Bar */}
          {filteredMedia.length > visibleCount && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-black/5 dark:border-white/5 text-xs text-stone-500 dark:text-stone-400">
              <span>
                Showing <strong className="text-stone-800 dark:text-stone-200">{Math.min(visibleCount, filteredMedia.length)}</strong> of <strong className="text-stone-800 dark:text-stone-200">{filteredMedia.length}</strong> media items
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 24)}
                  className={`px-3.5 py-1.5 ${currentAccent.buttonPrimary} text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer`}
                >
                  Load More (+24)
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredMedia.length)}
                  className="px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Show All ({filteredMedia.length})
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Media Modal */}
      {showAddModal && (
        <div
          id="add-media-modal-overlay"
          className="fixed inset-0 z-50 bg-[#0f0f11]/90 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Add Media</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMedia} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />

              <input
                type="text"
                required
                placeholder="URL (Apple Photos / Video / Article)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />

              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 font-semibold focus:outline-none"
              >
                <option value="apple-photos">Apple Photos</option>
                <option value="tiktok">Video (TikTok / YouTube)</option>
                <option value="photo">Photo Image URL</option>
                <option value="article">Article / Link</option>
              </select>

              <select
                value={targetWeekId}
                onChange={(e) => setTargetWeekId(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-stone-900 dark:text-stone-100 font-semibold focus:outline-none"
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.weekTitle}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-3.5 py-1.5 text-xs font-semibold text-white ${currentAccent.buttonPrimary} rounded-xl shadow-xs`}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <MediaLightboxModal media={previewMedia} onClose={() => setPreviewMedia(null)} />
    </div>
  );
});
