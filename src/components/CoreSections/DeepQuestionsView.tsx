import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderOpen,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CurrentUserProfile } from '../../lib/firebase';
import { CoreTopicItem } from '../../types';
import { formatTimestamp } from '../../utils/storage';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { HighlightText } from '../HighlightText';

interface DeepQuestionsViewProps {
  items: CoreTopicItem[];
  currentUser: CurrentUserProfile;
  onUpdateItems: (items: CoreTopicItem[]) => void;
  onOpenCommentSection?: (sectionTag?: string) => void;
  searchQuery?: string;
}

interface SubCategoryGroup {
  id: string;
  name: string;
  description: string;
  items: CoreTopicItem[];
}

const DEFAULT_SUBTOPICS = [
  {
    id: 'deep-questions',
    name: 'Deep Questions',
    description: 'Core questions exploring values, future vision, emotional safety, and conflict reset rituals.',
  },
  {
    id: 'questions-to-ask-her-understand',
    name: 'Questions To Understand Her (Not Just To Answer)',
    description: 'Deep empathy inquiries into her past emotional triggers, body language, and feelings.',
  },
  {
    id: 'casual-questions',
    name: 'Casual & Lighthearted Questions',
    description: 'Everyday curiosity, favorite media, creative musings, and dream travel spots.',
  },
  {
    id: 'my-answers-deep',
    name: 'My Answers & Reflections',
    description: 'Personal answers written out beforehand to reflect on my own growth and readiness.',
  },
];

export const DeepQuestionsView: React.FC<DeepQuestionsViewProps> = ({
  items,
  currentUser,
  onUpdateItems,
  onOpenCommentSection,
  searchQuery: externalSearchQuery,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined && externalSearchQuery !== '' ? externalSearchQuery : localSearchQuery;
  const [filterMode, setFilterMode] = useState<'all' | 'answered' | 'unanswered' | 'highlighted'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick inline answer editing states
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState('');

  // Add Question Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newAnswerText, setNewAnswerText] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('deep-questions');
  const [newIsHighlighted, setNewIsHighlighted] = useState(true);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<CoreTopicItem | null>(null);

  const isOwner = currentUser.role === 'owner';
  const canEdit = currentUser.role === 'owner' || currentUser.role === 'editor';
  const canDelete = isOwner || currentUser.role === 'editor';

  // Toggle group collapse
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = () => {
    setCollapsedGroups({});
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    DEFAULT_SUBTOPICS.forEach((s) => {
      allCollapsed[s.id] = true;
    });
    setCollapsedGroups(allCollapsed);
  };

  // Auto-expand accordion subtopics when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      setCollapsedGroups({});
    }
  }, [searchQuery]);

  // Group items by subcategory
  const groupedQuestions = useMemo<SubCategoryGroup[]>(() => {
    const groupsMap: Record<string, CoreTopicItem[]> = {};

    DEFAULT_SUBTOPICS.forEach((sub) => {
      groupsMap[sub.id] = [];
    });

    items.forEach((item) => {
      const subId = item.subCategoryId || 'deep-questions';
      if (!groupsMap[subId]) {
        groupsMap[subId] = [];
      }
      groupsMap[subId].push(item);
    });

    return DEFAULT_SUBTOPICS.map((sub) => {
      let groupItems = groupsMap[sub.id] || [];

      // Apply search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        groupItems = groupItems.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.content.toLowerCase().includes(q) ||
            (item.answers && item.answers.toLowerCase().includes(q))
        );
      }

      // Apply filter mode
      if (filterMode === 'answered') {
        groupItems = groupItems.filter((item) => !!item.answers?.trim());
      } else if (filterMode === 'unanswered') {
        groupItems = groupItems.filter((item) => !item.answers?.trim());
      } else if (filterMode === 'highlighted') {
        groupItems = groupItems.filter((item) => !!item.isHighlightedAnswer);
      }

      return {
        ...sub,
        items: groupItems,
      };
    });
  }, [items, searchQuery, filterMode]);

  const handleCopyQuestion = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveInlineAnswer = (itemId: string) => {
    const updated = items.map((i) => {
      if (i.id === itemId) {
        return {
          ...i,
          answers: editingAnswerText.trim(),
          timestamp: formatTimestamp(),
        };
      }
      return i;
    });
    onUpdateItems(updated);
    setEditingAnswerId(null);
    setEditingAnswerText('');
  };

  const handleToggleHighlight = (item: CoreTopicItem) => {
    const updated = items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          isHighlightedAnswer: !i.isHighlightedAnswer,
          timestamp: formatTimestamp(),
        };
      }
      return i;
    });
    onUpdateItems(updated);
  };

  const { confirmDelete } = useConfirmDelete();

  const handleDelete = (itemId: string) => {
    confirmDelete({
      title: 'Delete Question?',
      message: 'Are you sure you want to delete this question and its answer? This action cannot be undone.',
      confirmText: 'Delete Question',
      onConfirm: () => {
        onUpdateItems(items.filter((i) => i.id !== itemId));
      },
    });
  };

  const handleCreateQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuestionText.trim()) return;

    const newItem: CoreTopicItem = {
      id: 'q-' + Date.now(),
      categoryId: 'questions-to-ask-her',
      subCategoryId: newSubCategory,
      title: newTitle.trim(),
      content: newQuestionText.trim(),
      answers: newAnswerText.trim() || undefined,
      isHighlightedAnswer: newIsHighlighted,
      timestamp: formatTimestamp(),
      priority: 'High',
    };

    onUpdateItems([newItem, ...items]);
    setShowAddModal(false);
    setNewTitle('');
    setNewQuestionText('');
    setNewAnswerText('');
  };

  const handleEditModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = items.map((i) => (i.id === editingItem.id ? editingItem : i));
    onUpdateItems(updated);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100">
                Questions To Ask Her — Dual-Pane Reflection
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
              Side-by-side card layout pairing deep questions with your prepared answers, organized in collapsible subtopic accordions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Collapse All
            </button>

            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-2 shadow-sm transition-all hover:scale-102"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question & Answer</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'all'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            All Questions ({items.length})
          </button>

          <button
            onClick={() => setFilterMode('answered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'answered'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            Has My Answer ({items.filter((i) => !!i.answers?.trim()).length})
          </button>

          <button
            onClick={() => setFilterMode('unanswered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'unanswered'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
            }`}
          >
            Needs My Answer ({items.filter((i) => !i.answers?.trim()).length})
          </button>

          <button
            onClick={() => setFilterMode('highlighted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'highlighted'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
            }`}
          >
            Therapist Highlighted ({items.filter((i) => !!i.isHighlightedAnswer).length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deep questions, prompts, and your reflections..."
            value={searchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          {searchQuery && (
            <button
              onClick={() => setLocalSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Accordion Subtopic Sections */}
      <div className="space-y-5">
        {groupedQuestions.map((group) => {
          const isCollapsed = !!collapsedGroups[group.id];

          return (
            <div
              key={group.id}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden transition-all duration-200"
            >
              {/* Accordion Subtopic Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50/70 dark:hover:bg-stone-800/50 transition-colors border-b border-stone-100 dark:border-stone-800/80"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100">
                        <HighlightText text={group.name} highlight={searchQuery} />
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {group.items.length} {group.items.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                      <HighlightText text={group.description} highlight={searchQuery} />
                    </p>
                  </div>
                </div>

                <span className="text-xs text-stone-400 font-semibold hidden sm:inline-block">
                  {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                </span>
              </button>

              {/* Accordion Content Body */}
              {!isCollapsed && (
                <div className="p-4 sm:p-5 space-y-4">
                  {group.items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
                      No questions in this subtopic matching your filter.
                    </div>
                  ) : (
                    group.items.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                          item.isHighlightedAnswer
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/80 ring-1 ring-blue-300/40'
                            : 'bg-stone-50/50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800'
                        }`}
                      >
                        {/* Question & Answer Card Header */}
                        <div className="p-3 sm:px-4 bg-white dark:bg-stone-900 border-b border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                              <HighlightText text={item.title} highlight={searchQuery} />
                            </span>

                            {item.isHighlightedAnswer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                Therapist Approved Highlight
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Copy Question */}
                            <button
                              onClick={() => handleCopyQuestion(item.content, item.id)}
                              title="Copy question text to clipboard"
                              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[10px] text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Copy Question</span>
                                </>
                              )}
                            </button>

                            {/* Comment Button */}
                            {onOpenCommentSection && (
                              <button
                                onClick={() => onOpenCommentSection(`Deep Question: "${item.title.slice(0, 25)}"`)}
                                title="Add comment"
                                className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 rounded-md text-xs font-semibold flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                                <span className="text-[10px]">Comment</span>
                              </button>
                            )}

                            {/* Highlight Toggle */}
                            {canEdit && (
                              <button
                                onClick={() => handleToggleHighlight(item)}
                                title="Toggle therapist blue highlight"
                                className={`px-2 py-1 border rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                                  item.isHighlightedAnswer
                                    ? 'bg-blue-600 text-white border-blue-700'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-200'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Highlight</span>
                              </button>
                            )}

                            {/* Edit Modal */}
                            {canEdit && (
                              <button
                                onClick={() => setEditingItem(item)}
                                title="Edit Question & Answer"
                                className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 rounded-md text-xs font-semibold flex items-center gap-1"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Edit</span>
                              </button>
                            )}

                            {/* Delete */}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                title="Delete Question"
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-md text-xs font-semibold flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span className="text-[10px]">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Side-by-Side Dual-Pane Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200 dark:divide-stone-800 p-4 sm:p-5 gap-4 md:gap-6">
                          {/* LEFT PANE: The Deep Question */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>The Deep Question / Prompt</span>
                            </div>

                            <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap font-medium">
                              <HighlightText text={item.content} highlight={searchQuery} />
                            </p>

                            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-mono pt-1">
                              Recorded: {item.timestamp}
                            </div>
                          </div>

                          {/* RIGHT PANE: My Answer & Personal Reflection */}
                          <div className="space-y-2 pt-3 md:pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>My Answer / Personal Reflection</span>
                              </div>

                              {canEdit && editingAnswerId !== item.id && (
                                <button
                                  onClick={() => {
                                    setEditingAnswerId(item.id);
                                    setEditingAnswerText(item.answers || '');
                                  }}
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                                >
                                  {item.answers ? 'Edit Answer' : '+ Write Answer'}
                                </button>
                              )}
                            </div>

                            {/* Answer Content or Inline Editor */}
                            {editingAnswerId === item.id && canEdit ? (
                              <div className="space-y-2 animate-in fade-in duration-150">
                                <div
                                  className="w-full relative transform-gpu typing-isolation-container"
                                  style={{
                                    contain: 'layout paint',
                                    willChange: 'contents',
                                    transform: 'translateZ(0)',
                                  }}
                                >
                                  <textarea
                                    rows={3}
                                    value={editingAnswerText}
                                    onChange={(e) => setEditingAnswerText(e.target.value)}
                                    placeholder="Write your honest, grounded reflection or planned response..."
                                    className="w-full p-2.5 text-xs sm:text-sm bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    autoFocus
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveInlineAnswer(item.id)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                                  >
                                    Save Answer
                                  </button>
                                  <button
                                    onClick={() => setEditingAnswerId(null)}
                                    className="px-2.5 py-1 text-stone-500 hover:text-stone-700 text-xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : item.answers ? (
                              <div className="p-3 bg-white dark:bg-stone-900/90 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-2xs">
                                <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                                  <HighlightText text={item.answers} highlight={searchQuery} />
                                </p>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  if (canEdit) {
                                    setEditingAnswerId(item.id);
                                    setEditingAnswerText('');
                                  }
                                }}
                                className={`p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center ${
                                  canEdit ? 'cursor-pointer hover:border-blue-400 bg-white/50 dark:bg-stone-900/50' : ''
                                }`}
                              >
                                <p className="text-xs text-stone-400 italic">
                                  {canEdit ? 'No answer entered yet. Click to write your reflection.' : 'No answer entered.'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Question & Answer Modal */}
      {showAddModal && (
        <div
          id="add-question-modal-overlay"
          className="fixed inset-0 z-50 bg-[#0f0f11]/90 flex items-center justify-center p-4 transform-gpu will-change-transform isolate"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 transform-gpu will-change-transform isolate">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Add Deep Question & My Answer
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestionSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Subtopic Category:
                </label>
                <select
                  value={newSubCategory}
                  onChange={(e) => setNewSubCategory(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs font-bold"
                >
                  {DEFAULT_SUBTOPICS.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Question Title / Topic:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Conflict Reset Rituals & Pausing Safely"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  The Deep Question (Left Card Pane):
                </label>
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., When conversations feel tense, what ritual or code phrase can we use to pause and reset?"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  My Answer / Prepared Reflection (Right Card Pane):
                </label>
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <textarea
                    rows={3}
                    placeholder="e.g., My Answer: Agree to take a 15-minute cooling breath pause, sit together with tea, and validate each other's feelings before speaking."
                    value={newAnswerText}
                    onChange={(e) => setNewAnswerText(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newIsHighlighted"
                  checked={newIsHighlighted}
                  onChange={(e) => setNewIsHighlighted(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="newIsHighlighted" className="text-xs text-stone-700 dark:text-stone-300 font-semibold cursor-pointer">
                  Highlight as Therapist Approved Answer (Blue Frame)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Question & Answer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          id="edit-question-modal-overlay"
          className="fixed inset-0 z-50 bg-[#0f0f11]/90 flex items-center justify-center p-4 transform-gpu will-change-transform isolate"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 transform-gpu will-change-transform isolate">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Edit Question & Answer Pair
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditModalSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Subtopic Category:
                </label>
                <select
                  value={editingItem.subCategoryId || 'deep-questions'}
                  onChange={(e) => setEditingItem({ ...editingItem, subCategoryId: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs font-bold"
                >
                  {DEFAULT_SUBTOPICS.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  The Deep Question (Left Card Pane):
                </label>
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <textarea
                    rows={3}
                    required
                    value={editingItem.content}
                    onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  My Answer (Right Card Pane):
                </label>
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <textarea
                    rows={3}
                    value={editingItem.answers || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, answers: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsHighlighted"
                  checked={!!editingItem.isHighlightedAnswer}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, isHighlightedAnswer: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editIsHighlighted" className="text-xs text-stone-700 dark:text-stone-300 font-semibold cursor-pointer">
                  Therapist Approved Highlight
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
