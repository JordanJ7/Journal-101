import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Send,
  Sparkles,
  Tag,
  Trash2,
  User,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { AccentTheme, CommentItem, UserRole } from '../types';
import { ACCENT_THEMES } from '../utils/theme';
import { formatTimestamp } from '../utils/storage';
import { useConfirmDelete } from './ConfirmDeleteModal';

interface CommentsSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  comments: CommentItem[];
  onAddComment: (comment: Omit<CommentItem, 'id' | 'timestamp'>) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onEditComment?: (id: string, newContent: string) => void;
  targetType: 'weekly' | 'core';
  targetId: string;
  targetTitle: string;
  currentUser: {
    email: string;
    displayName?: string;
    role: UserRole;
  };
  activeSectionTag?: string;
  onSelectActiveSectionTag?: (sectionTag: string | undefined) => void;
  onClearActiveSectionTag?: () => void;
  accentTheme?: AccentTheme;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  isOpen,
  onToggleOpen,
  comments,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onEditComment,
  targetType,
  targetId,
  targetTitle,
  currentUser,
  activeSectionTag,
  onSelectActiveSectionTag,
  onClearActiveSectionTag,
  accentTheme = 'amber',
}) => {
  const [commentText, setCommentText] = useState('');
  const [selectedSection, setSelectedSection] = useState(activeSectionTag || 'General');
  const [filterMode, setFilterMode] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [viewScope, setViewScope] = useState<'current' | 'all-entries'>('current');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const { confirmDelete } = useConfirmDelete();
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  // Sync selectedSection whenever activeSectionTag changes from outside (e.g. user clicked "Comment" on a section)
  React.useEffect(() => {
    if (activeSectionTag) {
      setSelectedSection(activeSectionTag);
    }
  }, [activeSectionTag]);

  // Can comment if owner, editor, or commenter
  const canComment = currentUser.role === 'owner' || currentUser.role === 'editor' || currentUser.role === 'commenter';

  // Filter comments for this scope and state
  const scopeComments = comments.filter((c) => {
    if (viewScope === 'current') {
      return c.targetType === targetType && c.targetId === targetId;
    }
    return true;
  });

  const filteredComments = scopeComments.filter((c) => {
    if (filterMode === 'unresolved') return !c.resolved;
    if (filterMode === 'resolved') return c.resolved;
    return true;
  });

  const unresolvedCount = scopeComments.filter((c) => !c.resolved).length;

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment({
      targetType,
      targetId,
      sectionKey: selectedSection || 'General',
      authorName: currentUser.displayName || (currentUser.role === 'commenter' ? 'Dr. Des (Therapist)' : currentUser.email),
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      content: commentText.trim(),
      resolved: false,
    });

    setCommentText('');
    if (onClearActiveSectionTag) {
      onClearActiveSectionTag();
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'commenter':
        return (
          <span className="text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full">
            Therapist / Commenter
          </span>
        );
      case 'owner':
        return (
          <span className={`text-[10px] font-bold ${currentAccent.iconBox} ${currentAccent.textPrimary} border ${currentAccent.border} px-2 py-0.5 rounded-full`}>
            Owner
          </span>
        );
      case 'editor':
        return (
          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            Editor
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full">
            Viewer
          </span>
        );
    }
  };

  return (
    <>
      {/* Floating Toggle Pill when collapsed (Google Docs style side ribbon) */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          id="comments-toggle-ribbon"
          className="fixed right-3 sm:right-6 bottom-20 z-40 bg-white text-slate-700 dark:bg-stone-900 dark:text-stone-200 px-3.5 py-2 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2.5 text-xs font-semibold hover:scale-105 active:scale-95 transition-all border border-slate-200/90 dark:border-stone-700 cursor-pointer group"
          title="Open Comments & Feedback Sidebar"
        >
          <div className="relative">
            <div className={`w-6 h-6 rounded-full ${currentAccent.iconBox} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            {unresolvedCount > 0 && (
              <span className={`absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 ${currentAccent.bg500} text-white text-[9px] font-mono rounded-full flex items-center justify-center font-bold shadow-2xs`}>
                {unresolvedCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline font-medium text-slate-700 dark:text-stone-200">
            Comments ({scopeComments.length})
          </span>
          <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-stone-500 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Expanded Comments Sidebar Panel */}
      <aside
        id="comments-sidebar-panel"
        className={`fixed top-16 right-0 bottom-0 z-40 w-full max-w-sm sm:w-96 bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header with Collapsible Arrow */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-950/50">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${currentAccent.iconBox} rounded-lg`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Comments & Feedback
                </h3>
                <span className={`text-[10px] font-mono ${currentAccent.iconBox} font-bold px-1.5 py-0.5 rounded-full`}>
                  {scopeComments.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-[200px]">
                {targetTitle}
              </p>
            </div>
          </div>

          {/* Collapse with Arrow */}
          <button
            onClick={onToggleOpen}
            className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Collapse Sidebar"
          >
            <span className="text-[11px] hidden sm:inline">Close</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Scope & Filter Bar */}
        <div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                onClick={() => setViewScope('current')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  viewScope === 'current'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                This Entry ({comments.filter((c) => c.targetType === targetType && c.targetId === targetId).length})
              </button>
              <button
                onClick={() => setViewScope('all-entries')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  viewScope === 'all-entries'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                }`}
              >
                All ({comments.length})
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-1 rounded-lg ${
                  filterMode === 'all'
                    ? `font-bold ${currentAccent.textPrimary} ${currentAccent.iconBox}`
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('unresolved')}
                className={`px-2 py-1 rounded-lg ${
                  filterMode === 'unresolved'
                    ? `font-bold ${currentAccent.textPrimary} ${currentAccent.iconBox}`
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setFilterMode('resolved')}
                className={`px-2 py-1 rounded-lg ${
                  filterMode === 'resolved'
                    ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        {/* Comments Stream (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredComments.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className={`w-10 h-10 mx-auto rounded-full ${currentAccent.iconBox} flex items-center justify-center`}>
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {filterMode === 'resolved'
                  ? 'No resolved comments yet'
                  : filterMode === 'unresolved'
                  ? 'No open comments'
                  : 'No comments yet for this entry'}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs mx-auto">
                {canComment
                  ? 'Leave therapist feedback, ask reflection questions, or leave notes on specific sections below.'
                  : 'Log in or switch to a Commenter or Editor role to add notes and answers.'}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                onMouseEnter={() => onSelectActiveSectionTag?.(comment.sectionKey || 'General')}
                onClick={() => onSelectActiveSectionTag?.(comment.sectionKey || 'General')}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 cursor-pointer ${
                  activeSectionTag && comment.sectionKey === activeSectionTag
                    ? `ring-2 ${currentAccent.iconBoxSelected} ${currentAccent.activeBorder} shadow-sm`
                    : comment.resolved
                    ? 'bg-slate-50/70 dark:bg-stone-900/40 border-slate-200 dark:border-stone-800 opacity-75'
                    : 'bg-white dark:bg-stone-900 border-slate-200/90 dark:border-stone-800 shadow-2xs hover:border-slate-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Author Info & Role Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200 border border-slate-200 dark:border-stone-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {comment.authorName}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getRoleBadge(comment.authorRole)}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Resolve, Edit, Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canComment && (
                      <button
                        onClick={() => onResolveComment(comment.id)}
                        className={`p-1 rounded-lg transition-colors ${
                          comment.resolved
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100'
                            : 'text-stone-400 hover:text-emerald-600 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                        title={comment.resolved ? 'Reopen Comment' : 'Mark Resolved'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(currentUser.role === 'owner' || (comment.authorEmail?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase())) && onEditComment && (
                      <button
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingCommentText(comment.content);
                        }}
                        className="p-1 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        title="Edit Comment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(currentUser.role === 'owner' || (comment.authorEmail?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase())) && (
                      <button
                        onClick={() => {
                          confirmDelete({
                            title: 'Delete Comment?',
                            message: 'Are you sure you want to delete this comment thread? This cannot be undone.',
                            confirmText: 'Delete Comment',
                            onConfirm: () => onDeleteComment(comment.id),
                          });
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Tag Badge */}
                {comment.sectionKey && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-[10px] font-semibold">
                    <Tag className="w-2.5 h-2.5 text-stone-400" />
                    <span>{comment.sectionKey}</span>
                  </div>
                )}

                {/* Comment Content or Inline Editor */}
                {editingCommentId === comment.id ? (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                    <div
                      className="typing-isolation-container"
                      style={{
                        contain: 'layout paint',
                        willChange: 'contents',
                        transform: 'translateZ(0)',
                      }}
                    >
                      <textarea
                        rows={3}
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className={`w-full p-2 text-xs bg-white dark:bg-stone-900 border ${currentAccent.border} rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 ${currentAccent.ring}`}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="px-2 py-1 text-stone-500 hover:text-stone-700 dark:text-stone-400 text-[11px] font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (editingCommentText.trim() && onEditComment) {
                            onEditComment(comment.id, editingCommentText.trim());
                            setEditingCommentId(null);
                          }
                        }}
                        className={`px-3 py-1 ${currentAccent.buttonPrimary} rounded-lg text-[11px] font-bold shadow-2xs`}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}

                {/* Prominent Timestamp & Status */}
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-1 border-t border-stone-100 dark:border-stone-800">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>{comment.timestamp}</span>
                  </span>

                  {comment.resolved && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-sans flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Input Form */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80">
          {canComment ? (
            <form onSubmit={handlePost} className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                  Leave Comment / Feedback
                </span>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    onSelectActiveSectionTag?.(e.target.value);
                  }}
                  className="text-[11px] py-1 px-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 font-medium"
                >
                  <option value="General">Section: General</option>
                  <option value="Journal Bullets">Section: Journal Bullets</option>
                  <option value="Des Q&A">Section: Des Q&A</option>
                  <option value="Therapist Notes">Section: Therapist Notes</option>
                  <option value="Homework & Reading">Section: Homework</option>
                  <option value="Core Topic">Section: Core Topic</option>
                </select>
              </div>

              <div
                className="relative typing-isolation-container"
                style={{
                  contain: 'layout paint',
                  willChange: 'contents',
                  transform: 'translateZ(0)',
                }}
              >
                <textarea
                  rows={2}
                  placeholder={
                    currentUser.role === 'commenter'
                      ? 'Add therapist reflection, feedback, or answer question...'
                      : 'Type a comment or note (will capture exact timestamp)...'
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handlePost(e);
                    }
                  }}
                  className={`w-full p-2.5 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 ${currentAccent.ring} resize-none font-medium`}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Press ⌘+Enter to submit</span>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className={`px-3.5 py-1.5 ${currentAccent.buttonPrimary} disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center p-2 text-xs text-stone-500 dark:text-stone-400">
              🔒 Read-only mode. Use Access Management to switch to Commenter / Therapist role to add comments.
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
